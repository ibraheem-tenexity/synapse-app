import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSource } from '@/lib/db-helpers'
import { db } from '@/db'
import { sources, jobs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { startJobRunner } from '@/lib/job-runner'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const { id } = await params

  const source = await getSource(result.userId, id)
  if (!source) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Reset source status to queued and clear previous processing state
  await db
    .update(sources)
    .set({ status: 'queued', processedAt: null, conceptCount: 0, errorMessage: null })
    .where(and(eq(sources.id, id), eq(sources.ownerUserId, result.userId)))

  // Create new extract job
  await db.insert(jobs).values({
    ownerUserId: result.userId,
    sourceId: id,
    kind: 'extract_source',
    stage: 'ingest',
    status: 'queued',
  })

  startJobRunner()

  return NextResponse.json({ ok: true })
}
