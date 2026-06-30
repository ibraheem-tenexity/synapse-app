import { db } from '@/db'
import { concepts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { cosineSimilarity } from './embeddings'

const SIMILARITY_THRESHOLD = 0.88 // concepts with cosine > 0.88 are merged

interface NewConcept {
  label: string
  normLabel: string
  shortDefinition: string | null
  embedding: number[]
  mentions: Array<{ snippet: string; offset_start: number; offset_end: number; source_id: string }>
  sourceId: string
}

interface ExistingConcept {
  id: string
  label: string
  normLabel: string
  aliases: string[]
  embedding: string | null // stored as JSON-serialized text in DB
  sourceIds: string[]
  mentions: unknown[]
  isCrossSource: boolean
}

export async function findOrMergeConcept(
  ownerUserId: string,
  newConcept: NewConcept
): Promise<{ conceptId: string; merged: boolean }> {
  // 1. Exact normalized-label match
  const exactMatch = await db
    .select()
    .from(concepts)
    .where(and(eq(concepts.ownerUserId, ownerUserId), eq(concepts.normLabel, newConcept.normLabel)))
    .limit(1)

  if (exactMatch.length > 0) {
    await mergeConcept(exactMatch[0] as unknown as ExistingConcept, newConcept)
    return { conceptId: exactMatch[0].id, merged: true }
  }

  // 2. Alias match — check if the new concept's normLabel matches any alias of existing concepts
  const allConcepts = await db
    .select({
      id: concepts.id,
      label: concepts.label,
      normLabel: concepts.normLabel,
      aliases: concepts.aliases,
      embedding: concepts.embedding,
      sourceIds: concepts.sourceIds,
      mentions: concepts.mentions,
      isCrossSource: concepts.isCrossSource,
    })
    .from(concepts)
    .where(eq(concepts.ownerUserId, ownerUserId))

  const aliasMatch = allConcepts.find((c) =>
    (c.aliases || []).some((a) => a.toLowerCase() === newConcept.normLabel)
  )

  if (aliasMatch) {
    await mergeConcept(aliasMatch as unknown as ExistingConcept, newConcept)
    return { conceptId: aliasMatch.id, merged: true }
  }

  // 3. Embedding similarity match (if we have an embedding)
  if (newConcept.embedding.length > 0) {
    let bestMatch: ExistingConcept | null = null
    let bestSimilarity = 0

    for (const c of allConcepts) {
      if (!c.embedding) continue
      // embedding is stored as JSON-serialized text
      let emb: number[]
      try {
        emb = JSON.parse(c.embedding as string) as number[]
      } catch {
        continue
      }
      const sim = cosineSimilarity(newConcept.embedding, emb)
      if (sim > bestSimilarity) {
        bestSimilarity = sim
        bestMatch = c as unknown as ExistingConcept
      }
    }

    if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLD) {
      await mergeConcept(bestMatch, newConcept)
      return { conceptId: bestMatch.id, merged: true }
    }
  }

  // 4. No match — create new concept
  const [created] = await db
    .insert(concepts)
    .values({
      ownerUserId,
      label: newConcept.label,
      normLabel: newConcept.normLabel,
      aliases: [],
      shortDefinition: newConcept.shortDefinition,
      mentions: newConcept.mentions,
      sourceIds: [newConcept.sourceId],
      isCrossSource: false,
      embedding: JSON.stringify(newConcept.embedding),
      referencesStatus: 'none',
    })
    .returning({ id: concepts.id })

  return { conceptId: created.id, merged: false }
}

async function mergeConcept(existing: ExistingConcept, newConcept: NewConcept) {
  const newSourceIds = [...new Set([...(existing.sourceIds || []), newConcept.sourceId])]
  const newMentions = [...(existing.mentions || []), ...newConcept.mentions]
  const newAliases = [...new Set([...(existing.aliases || []), newConcept.label])].filter(
    (a) => a !== existing.label // don't add canonical label as alias
  )

  // Only update embedding if the existing one is null/absent
  const hasExistingEmbedding = !!existing.embedding

  await db
    .update(concepts)
    .set({
      sourceIds: newSourceIds,
      mentions: newMentions,
      isCrossSource: newSourceIds.length > 1,
      aliases: newAliases,
      ...(hasExistingEmbedding ? {} : { embedding: JSON.stringify(newConcept.embedding) }),
      updatedAt: new Date(),
    })
    .where(eq(concepts.id, existing.id))
}
