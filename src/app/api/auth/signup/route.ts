/**
 * POST /api/auth/signup — create a new account.
 *
 * Two separated flows (the UI shows them as two distinct forms):
 *   · STUDENT → name + email + password + the CARD ID printed on the
 *     student's physical RFID card (nothing is auto-generated — scanning
 *     that card at the machine is what identifies the account)
 *   · ADMIN   → name + email + password + the admin access key
 *
 * Every new account starts at the demo zero-state:
 *   0 bottles · 0 points · no orders — the first inserted bottle
 *   is the first point ever earned.
 * Response mirrors /api/auth/login (user + session token).
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  isValidEmail,
  toAuthUser,
} from '@/lib/auth'
import { ADMIN_ACCESS_CODE } from '@/lib/auth-types'

export const runtime = 'nodejs'

/** Card IDs look like the demo RFID tags: RF-8823-1145 (lenient on length). */
function normalizeCardId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export async function POST(req: Request) {
  let body: {
    name?: string
    email?: string
    password?: string
    role?: string
    cardId?: string
    adminCode?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const role = body.role === 'ADMIN' ? 'ADMIN' : 'STUDENT'

  if (name.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters long.' },
      { status: 400 }
    )
  }
  if (role === 'ADMIN' && (body.adminCode ?? '').trim() !== ADMIN_ACCESS_CODE) {
    return NextResponse.json(
      { error: 'Invalid admin access key — account not verified as administrator.' },
      { status: 403 }
    )
  }

  // Students must register the ID of their physical RFID card — the machine
  // matches scans against this exact value, so it doubles as the login tag.
  let rfid: string | null = null
  if (role === 'STUDENT') {
    rfid = normalizeCardId(body.cardId ?? '')
    if (!rfid) {
      return NextResponse.json(
        { error: 'Enter the CARD ID printed on your RFID card.' },
        { status: 400 }
      )
    }
    if (!/^[A-Z0-9-]{4,24}$/.test(rfid)) {
      return NextResponse.json(
        { error: 'That Card ID looks invalid — use the ID printed on the card, e.g. RF-8823-1145.' },
        { status: 400 }
      )
    }
    const cardTaken = await db.user.findUnique({ where: { rfid } })
    if (cardTaken) {
      return NextResponse.json(
        { error: 'This card is already registered to an account.' },
        { status: 400 }
      )
    }
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in instead.' },
      { status: 400 }
    )
  }

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: hashPassword(password),
      role,
      provider: 'credentials',
      // Demo environment: accounts are treated as verified immediately.
      // Production would send a confirmation email before flipping this flag.
      emailVerified: true,
      status: 'ACTIVE',
      // Zero-state start — no free points, no free bottles.
      points: 0,
      bottles: 0,
      bottlesGoal: 50,
      grade: null,
      section: null,
      rfid,
    },
  })

  const { token, expiresAt } = await createSession(user.id)
  // Token mirrored in the body for the Bearer-header fallback (preview iframe
  // environments drop SameSite cookies — see lib/auth.ts).
  const res = NextResponse.json({ user: toAuthUser(user), token })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
  return res
}
