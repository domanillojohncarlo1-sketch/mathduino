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
 */
import { randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidEmail } from '@/lib/auth'

export const runtime = 'nodejs'

const CODE_TTL_MINUTES = 15

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

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json(
      { error: 'No account found with this email address.' },
      { status: 404 }
    )
  }

  // One live code per account — older codes become invalid immediately.
  const code = String(randomInt(100000, 1000000))
  await db.passwordReset.deleteMany({ where: { userId: user.id } })
  await db.passwordReset.create({
    data: {
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  })

  return NextResponse.json({
    sent: true,
    expiresInMin: CODE_TTL_MINUTES,
    // Demo mode: no mail provider, so the "email" is surfaced in the UI.
    demoCode: code,
  })
}
