import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { parsePdf } from '@/lib/parse-pdf'
import { normalizeText, truncateText } from '@/lib/normalize-text'
import { enqueueExtractSourceJob } from '@/lib/enqueue'
import { startJobRunner } from '@/lib/job-runner'
import { db } from '@/db'
import { sources } from '@/db/schema'

// 20 MB limit per BR2
const MAX_BYTES = 20 * 1024 * 1024
// ~200k chars per BR2
const MAX_CHARS = 200_000

// POST /api/sources/upload — multipart PDF/Markdown upload → parse → create source + enqueue job
export async function POST(req: NextRequest) {
  const { userId, error } = await requireSession(req)
  if (error) return error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    return NextResponse.json({ error: `Failed to parse form data: ${String(e)}` }, { status: 400 })
  }

  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max 20 MB). Got ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
      { status: 413 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const mimeType = file.type
  const fileName = file.name
  const fileNameLower = fileName.toLowerCase()

  let rawText = ''
  let detectedTitle = fileName.replace(/\.[^.]+$/, '') || 'Untitled'

  if (mimeType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
    try {
      const parsed = await parsePdf(buffer)
      rawText = parsed.rawText
      if (parsed.title && parsed.title !== 'Untitled PDF') {
        detectedTitle = parsed.title
      }
    } catch (e) {
      return NextResponse.json({ error: `Failed to parse PDF: ${String(e)}` }, { status: 422 })
    }
  } else if (
    mimeType === 'text/markdown' ||
    fileNameLower.endsWith('.md') ||
    mimeType === 'text/plain' ||
    fileNameLower.endsWith('.txt')
  ) {
    rawText = buffer.toString('utf-8')
  } else {
    // Fallback: treat as plain text
    rawText = buffer.toString('utf-8')
  }

  // BR2: enforce 200k char limit
  const { text: truncatedText, truncated: wasTruncated } = truncateText(rawText, MAX_CHARS)
  const normalizedText = normalizeText(truncatedText)
  const charCount = normalizedText.length

  // Determine inputType from file
  const inputType =
    mimeType === 'application/pdf' || fileNameLower.endsWith('.pdf')
      ? 'pdf'
      : fileNameLower.endsWith('.md') || mimeType === 'text/markdown'
        ? 'markdown'
        : 'paste'

  // Get optional title override from form
  const titleField = formData.get('title')
  const title = (titleField && typeof titleField === 'string' ? titleField : null) || detectedTitle

  let source
  try {
    const rows = await db
      .insert(sources)
      .values({
        ownerUserId: userId,
        title,
        inputType,
        originUrl: null,
        rawText: normalizedText,
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
    {
      sourceId: source.id,
      title: source.title,
      rawText: source.rawText,
      charCount: source.charCount,
      truncated: wasTruncated,
    },
    { status: 201 }
  )
}
