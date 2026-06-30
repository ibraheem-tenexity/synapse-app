import { getClient, liveAvailable, MODEL } from './openrouter'
import { db } from '@/db'
import { refs, concepts } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface Reference {
  title: string
  url: string
  snippet: string
  sourceKind: 'paper' | 'web' | 'doc'
}

// Generate search queries for a concept using LLM
async function generateSearchQueries(
  conceptLabel: string,
  definition: string | null
): Promise<string[]> {
  if (!liveAvailable()) {
    // Deterministic fallback: standard query patterns
    return [
      `${conceptLabel} research papers`,
      `${conceptLabel} academic survey`,
      `introduction to ${conceptLabel}`,
    ]
  }

  const client = getClient()
  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Generate 3 scholarly search queries for the given concept. Return JSON: {"queries": ["query1", "query2", "query3"]}',
      },
      {
        role: 'user',
        content: `Concept: ${conceptLabel}\n${definition ? `Definition: ${definition}` : ''}`,
      },
    ],
    max_tokens: 200,
  })

  const parsed = JSON.parse(response.choices[0].message.content || '{}')
  return parsed.queries || [`${conceptLabel} research`]
}

// Query OpenAlex for papers matching a search query
async function queryOpenAlex(query: string): Promise<Reference[]> {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3&select=id,title,doi,abstract_inverted_index,primary_location&mailto=synapse@example.com`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []

    const data = await res.json()
    return (data.results || [])
      .map((work: any) => {
        // Reconstruct abstract from inverted index
        let snippet = ''
        if (work.abstract_inverted_index) {
          const words: string[] = []
          for (const [word, positions] of Object.entries(
            work.abstract_inverted_index as Record<string, number[]>
          )) {
            for (const pos of positions) words[pos] = word
          }
          snippet = words.filter(Boolean).join(' ').slice(0, 200)
        }

        const doi = work.doi || ''
        const refUrl = doi
          ? doi
          : work.primary_location?.landing_page_url || work.id || ''

        return {
          title: work.title || 'Untitled',
          url: refUrl.startsWith('http')
            ? refUrl
            : `https://doi.org/${doi.replace('https://doi.org/', '')}`,
          snippet,
          sourceKind: 'paper' as const,
        }
      })
      .filter((r: Reference) => r.url && r.url.startsWith('http'))
  } catch {
    return []
  }
}

// Query Crossref for papers matching a search query
async function queryCrossref(query: string): Promise<Reference[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3&select=title,DOI,abstract`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Synapse/1.0 (mailto:synapse@example.com)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.message?.items || [])
      .map((item: any) => ({
        title: Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled',
        url: `https://doi.org/${item.DOI}`,
        snippet: (item.abstract || '').replace(/<[^>]+>/g, '').slice(0, 200),
        sourceKind: 'paper' as const,
      }))
      .filter((r: Reference) => r.url && r.title)
  } catch {
    return []
  }
}

// Deterministic fixture references (for when no live key / API unavailable)
function getFixtureReferences(conceptLabel: string): Reference[] {
  const wikiSlug = conceptLabel.replace(/\s+/g, '_')
  return [
    {
      title: `${conceptLabel} — Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiSlug)}`,
      snippet: `Wikipedia article about ${conceptLabel}`,
      sourceKind: 'web',
    },
    {
      title: `OpenAlex search: ${conceptLabel}`,
      url: `https://openalex.org/works?search=${encodeURIComponent(conceptLabel)}`,
      snippet: `Academic papers on ${conceptLabel} from OpenAlex open access scholarly database`,
      sourceKind: 'paper',
    },
    {
      title: `Semantic Scholar: ${conceptLabel}`,
      url: `https://www.semanticscholar.org/search?q=${encodeURIComponent(conceptLabel)}&sort=Relevance`,
      snippet: `Research papers about ${conceptLabel} from Semantic Scholar`,
      sourceKind: 'paper',
    },
  ]
}

// Main references research function
export async function researchReferences(
  conceptId: string,
  conceptLabel: string,
  definition: string | null
): Promise<void> {
  // Update status to generating
  await db
    .update(concepts)
    .set({ referencesStatus: 'generating' })
    .where(eq(concepts.id, conceptId))

  try {
    let allRefs: Reference[] = []

    if (liveAvailable()) {
      // Live path: generate queries → call OpenAlex + Crossref
      const queries = await generateSearchQueries(conceptLabel, definition)

      const [openAlexResults, crossrefResults] = await Promise.all([
        queryOpenAlex(queries[0] || conceptLabel),
        queryCrossref(queries[1] || conceptLabel),
      ])

      allRefs = [...openAlexResults, ...crossrefResults]

      // Deduplicate by URL
      const seen = new Set<string>()
      allRefs = allRefs.filter((r) => {
        if (seen.has(r.url)) return false
        seen.add(r.url)
        return true
      })
    }

    // Supplement with fixtures if we don't have enough (or no live key)
    if (allRefs.length < 3) {
      const fixtures = getFixtureReferences(conceptLabel)
      allRefs = [...allRefs, ...fixtures].slice(0, 7)
    }

    // Keep 3-7 references
    allRefs = allRefs.slice(0, 7)

    // Store in DB
    if (allRefs.length > 0) {
      await db.delete(refs).where(eq(refs.conceptId, conceptId)) // clear old ones
      await db.insert(refs).values(
        allRefs.map((r, i) => ({
          conceptId,
          title: r.title,
          url: r.url,
          snippet: r.snippet || null,
          sourceKind: r.sourceKind,
          rank: i,
        }))
      )
    }

    await db
      .update(concepts)
      .set({ referencesStatus: 'ready' })
      .where(eq(concepts.id, conceptId))
  } catch (e) {
    console.error('Reference research failed:', e)
    await db
      .update(concepts)
      .set({ referencesStatus: 'failed' })
      .where(eq(concepts.id, conceptId))
  }
}
