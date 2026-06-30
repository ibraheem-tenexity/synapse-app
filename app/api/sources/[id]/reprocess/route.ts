import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSource } from '@/lib/db-helpers'
import { enqueueExtractSourceJob } from '@/lib/enqueue'
import { db } from '@/db'
import { sources } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

  // Reset source status to queued
  await db
    .update(sources)
    .set({ status: 'queued', errorMessage: null })
    .where(and(eq(sources.id, id), eq(sources.ownerUserId, result.userId)))

  // Enqueue a new extract job
  await enqueueExtractSourceJob(id, result.userId)

  return NextResponse.json({ queued: true, sourceId: id })
}
