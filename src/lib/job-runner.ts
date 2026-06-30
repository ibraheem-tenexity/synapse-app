import { db } from '@/db'
import { relations, sources, concepts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { extractConcepts } from './extractor'
import { getEmbedding } from './embeddings'
import { findOrMergeConcept } from './concept-merger'
import { researchReferences } from './references'

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

  // Insert / merge concepts using enhanced norm-label + alias + cosine-similarity dedup
  const conceptIds: Record<string, string> = {}
  for (const concept of result.concepts) {
    const normLabel = concept.label.toLowerCase().trim()
    const embedding = await getEmbedding(concept.label + ' ' + (concept.short_definition || ''))

    const { conceptId } = await findOrMergeConcept(ownerUserId, {
      label: concept.label,
      normLabel,
      shortDefinition: concept.short_definition || null,
      embedding,
      mentions: concept.mentions.map((m: any) => ({ ...m, source_id: sourceId })),
      sourceId,
    })

    conceptIds[concept.label] = conceptId
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
  const conceptId = (job.concept_id || job.conceptId) as string | undefined
  if (!conceptId) return

  const [concept] = await db
    .select({
      id: concepts.id,
      label: concepts.label,
      shortDefinition: concepts.shortDefinition,
    })
    .from(concepts)
    .where(eq(concepts.id, conceptId))
    .limit(1)

  if (!concept) return

  await researchReferences(concept.id, concept.label, concept.shortDefinition || null)

  await db.execute(
    sql`UPDATE jobs SET status = 'done', stage = 'done', updated_at = NOW() WHERE id = ${job.id as string}`
  )
}
