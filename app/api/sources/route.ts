import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSources, createSource } from '@/lib/db-helpers'
import { enqueueExtractSourceJob } from '@/lib/enqueue'

export async function GET(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const rows = await getSources(result.userId)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

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

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!inputType || typeof inputType !== 'string') {
    return NextResponse.json({ error: 'inputType is required' }, { status: 400 })
  }
  if (!rawText || typeof rawText !== 'string') {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
  }

  const source = await createSource(result.userId, {
    title,
    inputType,
    rawText,
    originUrl: typeof originUrl === 'string' ? originUrl : undefined,
    charCount: rawText.length,
  })

  await enqueueExtractSourceJob(source.id, result.userId)

  return NextResponse.json(source, { status: 201 })
}
