import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSources } from '@/lib/db-helpers'
import { enqueueExtractSourceJob } from '@/lib/enqueue'
import { startJobRunner } from '@/lib/job-runner'
import { fetchUrlAsText } from '@/lib/fetch-url'
import { normalizeText, truncateText } from '@/lib/normalize-text'
import { db } from '@/db'
import { sources } from '@/db/schema'

export async function GET(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const rows = await getSources(result.userId)
  return NextResponse.json(rows)
}

// POST /api/sources — create source from paste/markdown/url
export async function POST(req: NextRequest) {
  const { userId, error } = await requireSession(req)
  if (error) return error

  let body: {
    title?: string
    inputType?: string
    rawText?: string
    originUrl?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, inputType, rawText, originUrl } = body

  if (!inputType || !['paste', 'markdown', 'url'].includes(inputType)) {
    return NextResponse.json({ error: 'Invalid inputType' }, { status: 400 })
  }

  let finalRawText = rawText || ''
  let finalTitle = title

  // For URL type, fetch the content if rawText not provided
  if (inputType === 'url' && originUrl && !rawText) {
    try {
      const fetched = await fetchUrlAsText(originUrl)
      finalRawText = fetched.rawText
      finalTitle = finalTitle || fetched.title
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${String(e)}` },
        { status: 422 }
      )
    }
  }

  const { text: truncated, truncated: wasTruncated } = truncateText(finalRawText, 200000)
  finalRawText = normalizeText(truncated)

  const charCount = finalRawText.length

  let source
  try {
    const rows = await db
      .insert(sources)
      .values({
        ownerUserId: userId,
        title: finalTitle || 'Untitled',
        inputType,
        originUrl: originUrl || null,
        rawText: finalRawText,
        charCount,
        status: 'queued',
      })
      .returning()
    source = rows[0]
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to create source: ${String(e)}` },
      { status: 500 }
    )
  }

  try {
    await enqueueExtractSourceJob(source.id, userId)
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to enqueue job: ${String(e)}` },
      { status: 500 }
    )
  }

  // Start runner if not already running
  startJobRunner()

  return NextResponse.json(
    { source, truncated: wasTruncated },
    { status: 201 }
  )
}
