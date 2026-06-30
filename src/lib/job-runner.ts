import { db } from '@/db'
import { sql } from 'drizzle-orm'

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

async function runExtractSourceJob(job: Record<string, unknown>) {
  // Placeholder — actual implementation in T04/T05
  await db.execute(sql`
    UPDATE jobs
    SET stage = 'extract', log = '[]'::jsonb, updated_at = NOW()
    WHERE id = ${job.id as string}
  `)
  // Signal done for now
  await db.execute(sql`
    UPDATE jobs
    SET status = 'done', stage = 'done', updated_at = NOW()
    WHERE id = ${job.id as string}
  `)
  if (job.source_id) {
    await db.execute(sql`
      UPDATE sources
      SET status = 'done', processed_at = NOW()
      WHERE id = ${job.source_id as string}
    `)
  }
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
