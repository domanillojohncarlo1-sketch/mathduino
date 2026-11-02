/**
 * POST /api/auth/forgot-password — step 1 of the demo password reset.
 *
 * Body: { email }
 *
 * Creates a 6-digit reset code that expires in 15 minutes. There is no email
 * provider in the demo, so the code is returned in the response and shown in
 * the dialog ("demo mode") instead of being emailed — the flow, storage and
 * expiry behave exactly like a real reset email would.
 *
 * Step 2 (code + new password) is POST /api/auth/reset-password.
 *
 * Reset codes are stored through src/lib/password-reset-store.ts (raw SQL) so
 * the flow keeps working even when the deployed Prisma client predates the
 * PasswordReset model.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidEmail } from '@/lib/auth'
import {
  ensurePasswordResetTable,
  issueResetCode,
} from '@/lib/password-reset-store'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      )
    }

    // Hosted DB may predate this table — create it if missing (no-op otherwise).
    await ensurePasswordResetTable()

    // One live code per account — older codes become invalid immediately.
    const { code, expiresInMin } = await issueResetCode(user.id)

    return NextResponse.json({
      sent: true,
      expiresInMin,
      // Demo mode: no mail provider, so the "email" is surfaced in the UI.
      demoCode: code,
    })
  } catch (error) {
    // Never leak a silent empty 500 — always answer with a readable message.
    console.error('[forgot-password]', error)
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return NextResponse.json(
      { error: `Could not issue a reset code right now. (${message})` },
      { status: 500 }
    )
  }
}
