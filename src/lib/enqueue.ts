import { db } from '@/db'
import { jobs } from '@/db/schema'

export async function enqueueExtractSourceJob(sourceId: string, userId: string) {
  await db.insert(jobs).values({
    ownerUserId: userId,
    sourceId,
    kind: 'extract_source',
    stage: 'ingest',
    status: 'queued',
  })
}

export async function enqueueResearchReferencesJob(conceptId: string, userId: string) {
  await db.insert(jobs).values({
    ownerUserId: userId,
    conceptId,
    kind: 'research_references',
    stage: 'ingest',
    status: 'queued',
  })
}
