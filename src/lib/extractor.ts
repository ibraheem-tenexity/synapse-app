import { getClient, liveAvailable, MODEL } from './openrouter'

export interface ConceptMention {
  snippet: string
  offset_start: number
  offset_end: number
}

export interface ExtractedConcept {
  label: string
  short_definition: string
  mentions: ConceptMention[]
}

export interface ExtractedRelation {
  from: string
  to: string
  type: string
}

export interface ExtractionResult {
  concepts: ExtractedConcept[]
  relations: ExtractedRelation[]
}

async function extractLive(rawText: string): Promise<ExtractionResult> {
  const client = getClient()
  // Chunk large texts (keep first 50k chars for extraction)
  const text = rawText.slice(0, 50000)

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a concept extraction engine. Extract key concepts and their relationships from text.
Return JSON with this exact shape:
{
  "concepts": [
    {
      "label": "Concept Name",
      "short_definition": "One sentence definition",
      "mentions": [{"snippet": "exact quote from text", "offset_start": 0, "offset_end": 50}]
    }
  ],
  "relations": [
    {"from": "Concept A", "to": "Concept B", "type": "is-a|part-of|prerequisite-of|causes|contradicts|extends|related-to"}
  ]
}
Extract 15-40 concepts. Only use these relation types: is-a, part-of, prerequisite-of, causes, contradicts, extends, related-to.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    max_tokens: 4000,
  })

  const parsed = JSON.parse(response.choices[0].message.content || '{}')
  return parsed as ExtractionResult
}

function extractDeterministic(rawText: string): ExtractionResult {
  // Extract noun phrases from text using simple heuristics
  // Split into sentences, find capitalized multi-word phrases and important terms
  const headings = rawText.match(/^#+\s+(.+)$/gm)?.map((h) => h.replace(/^#+\s+/, '')) || []

  // Collect candidate concepts from headings + high-frequency capitalized terms
  const candidates = new Set<string>()
  headings.forEach((h) => candidates.add(h.trim()))

  // Find capitalized noun phrases (simple heuristic)
  const nounPhraseRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
  let match
  const counts: Record<string, number> = {}
  while ((match = nounPhraseRegex.exec(rawText)) !== null) {
    const phrase = match[1]
    if (phrase.length > 3) counts[phrase] = (counts[phrase] || 0) + 1
  }

  // Top frequent capitalized phrases + headings
  const topPhrases = Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([phrase]) => phrase)

  const allConcepts = [...new Set([...headings.slice(0, 10), ...topPhrases])].slice(0, 35)

  // If very few concepts found, add generic ones from split
  if (allConcepts.length < 5) {
    const sentenceWords = rawText
      .split(/[.!?]/)
      .flatMap((s) => s.trim().split(/\s+/))
      .filter((w) => w.length > 5 && /^[A-Za-z]/.test(w))
    const wordCounts: Record<string, number> = {}
    sentenceWords.forEach(
      (w) => (wordCounts[w.toLowerCase()] = (wordCounts[w.toLowerCase()] || 0) + 1)
    )
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w)
    allConcepts.push(...topWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)))
  }

  const concepts = allConcepts.slice(0, 35).map((label) => ({
    label,
    short_definition: `A key concept related to ${label.toLowerCase()}`,
    mentions: [
      {
        snippet: rawText.slice(0, 100),
        offset_start: 0,
        offset_end: Math.min(100, rawText.length),
      },
    ],
  }))

  // Generate deterministic relations between adjacent concepts
  const relations: ExtractedRelation[] = []
  for (let i = 0; i < Math.min(concepts.length - 1, 20); i++) {
    const types = ['related-to', 'extends', 'part-of', 'is-a', 'prerequisite-of']
    relations.push({
      from: concepts[i].label,
      to: concepts[i + 1].label,
      type: types[i % types.length],
    })
  }

  return { concepts, relations }
}

export async function extractConcepts(rawText: string): Promise<ExtractionResult> {
  if (liveAvailable()) {
    try {
      return await extractLive(rawText)
    } catch (err) {
      console.warn('Live extraction failed, falling back to deterministic:', err)
    }
  }
  return extractDeterministic(rawText)
}
