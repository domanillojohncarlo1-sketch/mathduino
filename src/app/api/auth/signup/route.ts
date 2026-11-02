/**
 * POST /api/auth/signup — create a new account.
 *
 * Two separated flows (the UI shows them as two distinct forms):
 *   · STUDENT → name + email + password (no code needed)
 *   · ADMIN   → name + email + password + the admin access code
 *
 * Every new account starts at the demo zero-state:
 *   0 bottles · 0 points · no orders — the first inserted bottle
 *   is the first point ever earned.
 * Response mirrors /api/auth/login (user + session token).
 */
import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
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

function makeRfid(): string {
  const a = randomBytes(2).toString('hex').toUpperCase()
  const b = randomBytes(2).toString('hex').toUpperCase()
  return `RF-${a}-${b}`
}

export async function POST(req: Request) {
  let body: {
    name?: string
    email?: string
    password?: string
    role?: string
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
  if (role === 'ADMIN' && body.adminCode !== ADMIN_ACCESS_CODE) {
    return NextResponse.json(
      { error: 'Invalid admin access code — account not verified as administrator.' },
      { status: 403 }
    )
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in instead.' },
      { status: 400 }
    )
  }

  // Generate a unique RFID tag for students (the physical card bound to the account)
  let rfid: string | null = role === 'STUDENT' ? makeRfid() : null
  for (let i = 0; i < 3 && rfid; i += 1) {
    const clash = await db.user.findUnique({ where: { rfid } })
    if (!clash) break
    rfid = makeRfid()
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
