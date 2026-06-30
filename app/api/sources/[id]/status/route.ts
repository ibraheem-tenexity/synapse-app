import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSource, getJobForSource } from '@/lib/db-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const { id } = await params

  // Verify ownership
  const source = await getSource(result.userId, id)
  if (!source) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const job = await getJobForSource(result.userId, id)

  if (!job) {
    return NextResponse.json({
      status: source.status,
      stage: null,
      log: [],
      error_message: source.errorMessage ?? null,
    })
  }

  return NextResponse.json({
    status: job.status,
    stage: job.stage,
    log: job.log,
    error_message: job.errorMessage ?? null,
  })
}
