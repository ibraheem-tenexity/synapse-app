import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-session'
import { getUserSettings, updateUserSettings } from '@/lib/db-helpers'

export async function GET(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  const settings = await getUserSettings(result.userId)

  if (!settings) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const result = await requireSession(req)
  if ('error' in result) return result.error

  let body: {
    displayName?: string
    researchDepth?: string
    theme?: string
    density?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const VALID_DEPTHS = ['light', 'standard', 'deep']
  const VALID_THEMES = ['light', 'dark', 'system']
  const VALID_DENSITIES = ['compact', 'comfortable', 'spacious']

  if (body.researchDepth !== undefined && !VALID_DEPTHS.includes(body.researchDepth)) {
    return NextResponse.json(
      { error: `researchDepth must be one of: ${VALID_DEPTHS.join(', ')}` },
      { status: 400 }
    )
  }
  if (body.theme !== undefined && !VALID_THEMES.includes(body.theme)) {
    return NextResponse.json(
      { error: `theme must be one of: ${VALID_THEMES.join(', ')}` },
      { status: 400 }
    )
  }
  if (body.density !== undefined && !VALID_DENSITIES.includes(body.density)) {
    return NextResponse.json(
      { error: `density must be one of: ${VALID_DENSITIES.join(', ')}` },
      { status: 400 }
    )
  }

  const updated = await updateUserSettings(result.userId, {
    displayName: body.displayName,
    researchDepth: body.researchDepth,
    theme: body.theme,
    density: body.density,
  })

  return NextResponse.json(updated)
}
