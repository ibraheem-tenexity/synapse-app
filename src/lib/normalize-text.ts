/**
 * normalize-text.ts
 * Text normalization utilities for source ingestion pipeline.
 */

/**
 * Strips excessive whitespace and normalizes unicode characters.
 * - Normalizes unicode to NFC form
 * - Collapses runs of spaces/tabs to a single space per line
 * - Collapses runs of more than 2 consecutive newlines to 2
 * - Trims leading/trailing whitespace
 */
export function normalizeText(raw: string): string {
  // Normalize unicode to NFC
  let text = raw.normalize('NFC')

  // Replace carriage returns
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Collapse runs of spaces/tabs within lines (but preserve newlines)
  text = text.replace(/[^\S\n]+/g, ' ')

  // Collapse more than 2 consecutive blank lines to 2
  text = text.replace(/\n{3,}/g, '\n\n')

  // Trim leading/trailing whitespace from each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')

  // Trim overall
  return text.trim()
}

/**
 * Enforces BR2: 200k character limit.
 * Returns the (possibly truncated) text and a flag indicating truncation.
 */
export function truncateText(
  text: string,
  maxChars: number
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false }
  }
  return { text: text.slice(0, maxChars), truncated: true }
}
