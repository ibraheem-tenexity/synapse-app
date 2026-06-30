import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { deleteInsight } from '@/lib/db-helpers'
import { db } from '@/db'
import { insights } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const { id } = await params

  // Check existence and ownership
  const rows = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.id, id), eq(insights.ownerUserId, result.userId)))
    .limit(1)

  if (!rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteInsight(result.userId, id)
  return new NextResponse(null, { status: 204 })
}
