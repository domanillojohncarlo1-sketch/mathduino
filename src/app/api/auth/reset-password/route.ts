/**
 * POST /api/auth/reset-password — step 2 of the demo password reset.
 *
 * Body: { email, code, password }
 *
 * Verifies the 6-digit code from /api/auth/forgot-password (still within its
 * 15-minute window), swaps the password hash and invalidates every session
 * plus all outstanding reset codes for the account.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, hashPassword } from '@/lib/auth'
import { ensurePasswordResetTable } from '@/lib/ensure-schema'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { email?: string; code?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const code = (body.code ?? '').trim()
  const password = body.password ?? ''

  if (!email || !code) {
    return NextResponse.json({ error: 'Enter the reset code sent to your email.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters long.' },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 })
  }

  // Hosted DB may predate this table — create it if missing (no-op otherwise).
  await ensurePasswordResetTable()

  const reset = await db.passwordReset.findFirst({
    where: { userId: user.id, code },
    orderBy: { createdAt: 'desc' },
  })
  if (!reset) {
    return NextResponse.json({ error: 'Invalid reset code — check and try again.' }, { status: 400 })
  }
  if (reset.expiresAt.getTime() < Date.now()) {
    await db.passwordReset.deleteMany({ where: { userId: user.id } })
    return NextResponse.json(
      { error: 'This reset code expired — request a new one.' },
      { status: 400 }
    )
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    }),
    // Consume every code and force re-login on other devices.
    db.passwordReset.deleteMany({ where: { userId: user.id } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ])

  const res = NextResponse.json({ ok: true })
  // Best-effort: clear the stale session cookie in this browser too.
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
