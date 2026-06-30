import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getInsights, createInsight } from '@/lib/db-helpers'

export async function GET(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const rows = await getInsights(result.userId)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  let body: {
    body?: string
    anchorType?: string
    conceptId?: string | null
    connectionConceptIds?: string[] | null
    confidence?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.body || typeof body.body !== 'string') {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }
  if (!body.anchorType || typeof body.anchorType !== 'string') {
    return NextResponse.json({ error: 'anchorType is required' }, { status: 400 })
  }

  const insight = await createInsight(result.userId, {
    body: body.body,
    anchorType: body.anchorType,
    conceptId: body.conceptId ?? null,
    connectionConceptIds: body.connectionConceptIds ?? null,
    confidence: body.confidence ?? null,
  })

  return NextResponse.json(insight, { status: 201 })
}
