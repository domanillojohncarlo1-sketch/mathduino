import { NextResponse } from 'next/server'
import { getSessionUser, toAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Returns the currently verified user, or { user: null }. */
export async function GET(req: Request) {
  const user = await getSessionUser(req)
  return NextResponse.json({ user: user ? toAuthUser(user) : null })
}
