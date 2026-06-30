/**
 * fetch-url.ts
 * Server-side URL fetch + Readability extraction.
 * TS-5: fetch HTML, extract clean article text via @mozilla/readability + jsdom.
 */

import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export async function fetchUrlAsText(url: string): Promise<{ title: string; rawText: string }> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Synapse/1.0 (learning app)' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const html = await response.text()
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) throw new Error('Could not extract readable content from URL')

  return {
    title: article.title || new URL(url).hostname,
    rawText: article.textContent || '',
  }
}
