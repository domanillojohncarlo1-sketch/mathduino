/**
 * POST /api/auth/reset-password — step 2 of the demo password reset.
 *
 * Body: { email, code, password }
 *
 * Verifies the 6-digit code from /api/auth/forgot-password (still within its
 * 15-minute window), swaps the password hash and invalidates every session
 * plus all outstanding reset codes for the account.
 *
 * Reset codes are stored through src/lib/password-reset-store.ts (raw SQL) so
 * the flow keeps working even when the deployed Prisma client predates the
 * PasswordReset model.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, hashPassword } from '@/lib/auth'
import {
  deleteResetCodes,
  ensurePasswordResetTable,
  findLatestResetCode,
} from '@/lib/password-reset-store'

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

  try {
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 })
    }

    // Hosted DB may predate this table — create it if missing (no-op otherwise).
    await ensurePasswordResetTable()

    const reset = await findLatestResetCode(user.id)
    if (!reset || reset.code !== code) {
      return NextResponse.json({ error: 'Invalid reset code — check and try again.' }, { status: 400 })
    }
    if (reset.expiresAt.getTime() < Date.now()) {
      await deleteResetCodes(user.id)
      return NextResponse.json(
        { error: 'This reset code expired — request a new one.' },
        { status: 400 }
      )
    }

    // Swap the hash, consume every code and force re-login on other devices.
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    })
    await deleteResetCodes(user.id)
    await db.session.deleteMany({ where: { userId: user.id } })

    const res = NextResponse.json({ ok: true })
    // Best-effort: clear the stale session cookie in this browser too.
    res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
    return res
  } catch (error) {
    // Never leak a silent empty 500 — always answer with a readable message.
    console.error('[reset-password]', error)
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return NextResponse.json(
      { error: `Could not update the password right now. (${message})` },
      { status: 500 }
    )
  }
}
