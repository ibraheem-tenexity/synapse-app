import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'

// 20 MB limit per BR2
const MAX_BYTES = 20 * 1024 * 1024
// ~200k chars per BR2
const MAX_CHARS = 200_000

export async function POST(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const formData = await req.formData()
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

  let rawText = ''
  const mimeType = file.type
  const fileName = file.name.toLowerCase()

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // Dynamically import pdf-parse to avoid issues at module level
    try {
      const pdfParse = (await import('pdf-parse')).default
      const parsed = await pdfParse(buffer)
      rawText = parsed.text
    } catch (e) {
      return NextResponse.json({ error: `Failed to parse PDF: ${String(e)}` }, { status: 422 })
    }
  } else {
    // Treat as plain text / markdown
    rawText = buffer.toString('utf-8')
  }

  // BR2: truncate to MAX_CHARS with warning
  let truncated = false
  if (rawText.length > MAX_CHARS) {
    rawText = rawText.slice(0, MAX_CHARS)
    truncated = true
  }

  return NextResponse.json({
    rawText,
    charCount: rawText.length,
    truncated,
    fileName: file.name,
    mimeType,
  })
}
