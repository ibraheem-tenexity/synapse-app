import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getConcept } from '@/lib/db-helpers'
import { enqueueResearchReferencesJob } from '@/lib/enqueue'
import { db } from '@/db'
import { concepts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const { id } = await params
  const concept = await getConcept(result.userId, id)

  if (!concept) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Only enqueue if not already generating or ready
  if (concept.referencesStatus === 'generating') {
    return NextResponse.json({ queued: false, status: 'generating' })
  }

  // Update concept references_status to generating
  await db
    .update(concepts)
    .set({ referencesStatus: 'generating' })
    .where(and(eq(concepts.id, id), eq(concepts.ownerUserId, result.userId)))

  await enqueueResearchReferencesJob(id, result.userId)

  return NextResponse.json({ queued: true, conceptId: id, status: 'generating' })
}
