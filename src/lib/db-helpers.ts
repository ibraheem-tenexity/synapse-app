import { db } from '@/db'
import { sources, concepts, relations, insights, users, jobs, refs } from '@/db/schema'
import { eq, and, sql, count } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function getSources(userId: string) {
  return db
    .select()
    .from(sources)
    .where(eq(sources.ownerUserId, userId))
    .orderBy(sql`${sources.createdAt} DESC`)
}

export async function getSource(userId: string, sourceId: string) {
  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.ownerUserId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function createSource(
  userId: string,
  data: {
    title: string
    inputType: string
    rawText: string
    originUrl?: string
    charCount?: number
  }
) {
  const rows = await db
    .insert(sources)
    .values({
      ownerUserId: userId,
      title: data.title,
      inputType: data.inputType,
      rawText: data.rawText,
      originUrl: data.originUrl ?? null,
      charCount: data.charCount ?? data.rawText.length,
      status: 'queued',
    })
    .returning()
  return rows[0]
}

export async function deleteSource(userId: string, sourceId: string) {
  await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.ownerUserId, userId)))
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export async function getGraph(userId: string) {
  // Get all concepts for the user
  const conceptRows = await db
    .select()
    .from(concepts)
    .where(eq(concepts.ownerUserId, userId))

  // Get all relations for the user
  const relationRows = await db
    .select()
    .from(relations)
    .where(eq(relations.ownerUserId, userId))

  // Compute degree for each concept
  const degreeMap = new Map<string, number>()
  for (const r of relationRows) {
    degreeMap.set(r.fromConceptId, (degreeMap.get(r.fromConceptId) ?? 0) + 1)
    degreeMap.set(r.toConceptId, (degreeMap.get(r.toConceptId) ?? 0) + 1)
  }

  const conceptsWithDegree = conceptRows.map((c) => ({
    ...c,
    // isCrossSource is included from the wildcard select; surface it explicitly
    // so graph UI can style cross-source nodes differently (T05)
    isCrossSource: c.isCrossSource,
    degree: degreeMap.get(c.id) ?? 0,
  }))

  return { concepts: conceptsWithDegree, relations: relationRows }
}

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export async function getConcept(userId: string, conceptId: string) {
  const { or } = await import('drizzle-orm')

  const rows = await db
    .select()
    .from(concepts)
    .where(and(eq(concepts.id, conceptId), eq(concepts.ownerUserId, userId)))
    .limit(1)

  if (!rows[0]) return null

  const concept = rows[0]

  // Get all relations involving this concept
  const conceptRelations = await db
    .select()
    .from(relations)
    .where(
      and(
        eq(relations.ownerUserId, userId),
        or(eq(relations.fromConceptId, conceptId), eq(relations.toConceptId, conceptId))
      )
    )

  // Collect neighbor concept IDs
  const neighborIds = [
    ...new Set(
      conceptRelations
        .flatMap((r) => [r.fromConceptId, r.toConceptId])
        .filter((id) => id !== conceptId)
    ),
  ]

  // Fetch neighbor concepts (subset of all user concepts)
  const allNeighborCandidates =
    neighborIds.length > 0
      ? await db
          .select({
            id: concepts.id,
            label: concepts.label,
            shortDefinition: concepts.shortDefinition,
            isCrossSource: concepts.isCrossSource,
          })
          .from(concepts)
          .where(eq(concepts.ownerUserId, userId))
      : []

  const filteredNeighbors = allNeighborCandidates.filter((n) =>
    neighborIds.includes(n.id)
  )

  // Get references for this concept
  const conceptRefs = await db
    .select()
    .from(refs)
    .where(eq(refs.conceptId, conceptId))

  // Build neighbor list with relation types
  const neighborList = filteredNeighbors.map((n) => {
    const rel = conceptRelations.find(
      (r) => r.fromConceptId === n.id || r.toConceptId === n.id
    )
    return { ...n, relationType: rel?.type || 'related-to' }
  })

  return {
    ...concept,
    neighbors: neighborList,
    refs: conceptRefs,
    mentions: (concept.mentions as any[]) || [],
  }
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export async function getInsights(userId: string) {
  return db
    .select()
    .from(insights)
    .where(eq(insights.ownerUserId, userId))
    .orderBy(sql`${insights.createdAt} DESC`)
}

export async function createInsight(
  userId: string,
  data: {
    body: string
    anchorType: string
    conceptId?: string | null
    connectionConceptIds?: string[] | null
    confidence?: string | null
  }
) {
  const rows = await db
    .insert(insights)
    .values({
      ownerUserId: userId,
      body: data.body,
      anchorType: data.anchorType,
      conceptId: data.conceptId ?? null,
      connectionConceptIds: data.connectionConceptIds ?? null,
      confidence: data.confidence ?? null,
    })
    .returning()
  return rows[0]
}

export async function deleteInsight(userId: string, insightId: string) {
  await db
    .delete(insights)
    .where(and(eq(insights.id, insightId), eq(insights.ownerUserId, userId)))
}

// ---------------------------------------------------------------------------
// Settings (user row)
// ---------------------------------------------------------------------------

export async function getUserSettings(userId: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      researchDepth: users.researchDepth,
      theme: users.theme,
      density: users.density,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function updateUserSettings(
  userId: string,
  patch: {
    displayName?: string
    researchDepth?: string
    theme?: string
    density?: string
  }
) {
  const rows = await db
    .update(users)
    .set({
      ...(patch.displayName !== undefined && { displayName: patch.displayName }),
      ...(patch.researchDepth !== undefined && { researchDepth: patch.researchDepth }),
      ...(patch.theme !== undefined && { theme: patch.theme }),
      ...(patch.density !== undefined && { density: patch.density }),
    })
    .where(eq(users.id, userId))
    .returning()
  return rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function getJobForSource(userId: string, sourceId: string) {
  const rows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.sourceId, sourceId), eq(jobs.ownerUserId, userId)))
    .orderBy(sql`${jobs.createdAt} DESC`)
    .limit(1)
  return rows[0] ?? null
}
