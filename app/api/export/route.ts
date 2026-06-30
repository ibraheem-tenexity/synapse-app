import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSources, getGraph, getInsights, getUserSettings } from '@/lib/db-helpers'

export async function GET(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const [sources, graph, insightRows, settings] = await Promise.all([
    getSources(result.userId),
    getGraph(result.userId),
    getInsights(result.userId),
    getUserSettings(result.userId),
  ])

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    user: settings
      ? {
          id: settings.id,
          email: settings.email,
          displayName: settings.displayName,
        }
      : null,
    sources,
    concepts: graph.concepts,
    relations: graph.relations,
    insights: insightRows,
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="synapse-export-${Date.now()}.json"`,
    },
  })
}
