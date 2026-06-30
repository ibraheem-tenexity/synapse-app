import { db } from '@/db'
import { concepts, relations, sources } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { extractConcepts } from './extractor'
import { getEmbedding } from './embeddings'

let runnerStarted = false

export function startJobRunner() {
  if (runnerStarted) return
  runnerStarted = true
  setInterval(async () => {
    try {
      await processNextJob()
    } catch (e) {
      console.error('Job runner error:', e)
    }
  }, 3000) // poll every 3 seconds
}

async function processNextJob() {
  // Claim next queued job using SELECT FOR UPDATE SKIP LOCKED
  // db.execute with postgres-js returns a RowList (array-like)
  const claimed = await db.execute<Record<string, unknown>>(sql`
    UPDATE jobs SET status = 'running', attempts = attempts + 1, updated_at = NOW()
    WHERE id = (
      SELECT id FROM jobs
      WHERE status = 'queued' AND attempts < 3
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `)

  if (!claimed.length) return

  const job = claimed[0]

  try {
    if (job.kind === 'extract_source') {
      await runExtractSourceJob(job)
    } else if (job.kind === 'research_references') {
      await runResearchReferencesJob(job)
    }
  } catch (e) {
    const errMsg = String(e)
    await db.execute(sql`
      UPDATE jobs
      SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END,
          error_message = ${errMsg},
          updated_at = NOW()
      WHERE id = ${job.id as string}
    `)
    if (job.source_id) {
      await db.execute(sql`
        UPDATE sources
        SET status = CASE
          WHEN (SELECT attempts FROM jobs WHERE id = ${job.id as string}) >= 3
          THEN 'failed'
          ELSE 'processing'
        END
        WHERE id = ${job.source_id as string}
      `)
    }
  }
}

async function updateJobStage(jobId: string, stage: string, message: string) {
  await db.execute(sql`
    UPDATE jobs SET stage = ${stage},
      log = log || ${JSON.stringify([{ stage, message, ts: new Date().toISOString() }])}::jsonb,
      updated_at = NOW()
    WHERE id = ${jobId}
  `)
}

async function runExtractSourceJob(job: Record<string, unknown>) {
  const jobId = job.id as string
  const sourceId = job.source_id as string
  const ownerUserId = job.owner_user_id as string

  // Update stage to extract
  await updateJobStage(jobId, 'extract', 'Extracting concepts with LLM...')
  await db.execute(sql`UPDATE sources SET status = 'processing' WHERE id = ${sourceId}`)

  // Get source text
  const [source] = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1)
  if (!source) throw new Error('Source not found')

  // Extract concepts and relations
  const result = await extractConcepts(source.rawText)

  await updateJobStage(jobId, 'link', 'Linking concepts across sources...')

  // Insert concepts
  const conceptIds: Record<string, string> = {}
  for (const concept of result.concepts) {
    const normLabel = concept.label.toLowerCase().trim()
    const embeddingVec = await getEmbedding(
      concept.label + ' ' + (concept.short_definition || '')
    )
    // Store embedding as JSON-serialized text (schema: text("embedding"))
    const embeddingJson = JSON.stringify(embeddingVec)

    // Check if concept already exists
    const [existing] = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.ownerUserId, ownerUserId), eq(concepts.normLabel, normLabel)))
      .limit(1)

    if (existing) {
      // Merge: append source
      const newSourceIds = [...new Set([...(existing.sourceIds || []), sourceId])]
      const existingMentions = (existing.mentions as Array<Record<string, unknown>>) || []
      const newMentions = [
        ...existingMentions,
        ...concept.mentions.map((m) => ({ ...m, source_id: sourceId })),
      ]
      await db
        .update(concepts)
        .set({
          sourceIds: newSourceIds,
          mentions: newMentions,
          isCrossSource: newSourceIds.length > 1,
          updatedAt: new Date(),
        })
        .where(eq(concepts.id, existing.id))
      conceptIds[concept.label] = existing.id
    } else {
      const [newConcept] = await db
        .insert(concepts)
        .values({
          ownerUserId,
          label: concept.label,
          normLabel,
          shortDefinition: concept.short_definition || null,
          mentions: concept.mentions.map((m) => ({ ...m, source_id: sourceId })),
          sourceIds: [sourceId],
          isCrossSource: false,
          embedding: embeddingJson,
          referencesStatus: 'none',
        })
        .returning()
      conceptIds[concept.label] = newConcept.id
    }
  }

  // Insert relations
  for (const rel of result.relations) {
    const fromId = conceptIds[rel.from]
    const toId = conceptIds[rel.to]
    if (!fromId || !toId) continue

    await db
      .insert(relations)
      .values({
        ownerUserId,
        fromConceptId: fromId,
        toConceptId: toId,
        type: rel.type,
        directed: true,
        sourceIds: [sourceId],
        weight: 1,
      })
      .onConflictDoNothing()
  }

  // Update source concept count
  await db.execute(sql`
    UPDATE sources SET concept_count = (
      SELECT COUNT(*) FROM concepts WHERE owner_user_id = ${ownerUserId} AND ${sourceId} = ANY(source_ids)
    ) WHERE id = ${sourceId}
  `)

  await updateJobStage(jobId, 'research', 'Queuing reference research...')

  // Mark done
  await db.execute(
    sql`UPDATE jobs SET status = 'done', stage = 'done', updated_at = NOW() WHERE id = ${jobId}`
  )
  await db.execute(
    sql`UPDATE sources SET status = 'done', processed_at = NOW() WHERE id = ${sourceId}`
  )
}

async function runResearchReferencesJob(job: Record<string, unknown>) {
  // Placeholder — actual implementation in T10
  await db.execute(sql`
    UPDATE jobs
    SET status = 'done', stage = 'done', updated_at = NOW()
    WHERE id = ${job.id as string}
  `)
  if (job.concept_id) {
    await db.execute(sql`
      UPDATE concepts
      SET references_status = 'ready', updated_at = NOW()
      WHERE id = ${job.concept_id as string}
    `)
  }
}
