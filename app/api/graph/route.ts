import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getGraph } from '@/lib/db-helpers'

export async function GET(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const graph = await getGraph(result.userId)
  return NextResponse.json(graph)
}
