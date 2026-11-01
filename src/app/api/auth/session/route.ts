/**
 * GET /api/auth/session — "who am I?" check used on page load.
 * Reads the session from the httpOnly cookie OR the Authorization:
 * Bearer header, so it works in browsers and on the ESP32 alike.
 */
import { NextResponse } from 'next/server'
import { getSessionUser, toAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Returns the currently verified user, or { user: null }. */
export async function GET(req: Request) {
  const user = await getSessionUser(req)
  return NextResponse.json({ user: user ? toAuthUser(user) : null })
}
