import { NextResponse } from 'next/server'
import { SESSION_COOKIE, destroySession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  // destroySession resolves the session from the Bearer header first, then
  // the cookie — mirrors how the client talks to us in each environment.
  await destroySession(req)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
