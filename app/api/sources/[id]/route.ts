import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getSource, deleteSource } from '@/lib/db-helpers'

export async function GET(
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

  return NextResponse.json(source)
}

export async function DELETE(
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

  // Cascade is handled by DB foreign keys (ON DELETE CASCADE)
  await deleteSource(result.userId, id)

  return new NextResponse(null, { status: 204 })
}
