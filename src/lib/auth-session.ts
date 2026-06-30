import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function requireSession(_req?: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { userId: session.user.id as string }
}
