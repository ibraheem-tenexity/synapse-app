/**
 * parse-pdf.ts
 * PDF parsing utility for source ingestion pipeline.
 * TS-4: parse PDF buffer to raw text using pdf-parse.
 */

import pdfParse from 'pdf-parse'

export async function parsePdf(buffer: Buffer): Promise<{ title: string; rawText: string }> {
  const data = await pdfParse(buffer)
  return {
    title: (data.info?.Title as string) || 'Untitled PDF',
    rawText: data.text || '',
  }
}
