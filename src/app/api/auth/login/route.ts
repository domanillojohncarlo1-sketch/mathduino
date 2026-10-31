import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, createSession, toAuthUser, verifyPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }
  if (user.status === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'This account has been suspended — contact the Eco-Tech Club administrator.' },
      { status: 403 }
    )
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: `This email is registered via ${user.provider}. Use that social button to sign in.` },
      { status: 400 }
    )
  }

  const { token, expiresAt } = await createSession(user.id)
  // The token is also returned in the body so the client can mirror it as an
  // `Authorization: Bearer` header — the sandbox preview iframe blocks
  // SameSite cookies, so the cookie alone is not enough there.
  const res = NextResponse.json({ user: toAuthUser(user), token })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
  return res
}
