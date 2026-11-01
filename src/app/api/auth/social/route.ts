import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, createSession, isValidEmail, toAuthUser } from '@/lib/auth'
import { PROVIDER_LABEL, SOCIAL_PERSONAS, type SocialProvider } from '@/lib/auth-types'

export const runtime = 'nodejs'

const VALID_PROVIDERS: SocialProvider[] = ['google', 'github', 'facebook']

/**
 * Simulated OAuth sign-in endpoint.
 *
 * In production this handler would be replaced by a NextAuth OAuth callback
 * (Google / GitHub / Facebook provider) that receives a verified profile.
 * The demo performs the same job: look up the provider account by email and
 * create the account on first sign-in, then issue a session cookie.
 */
export async function POST(req: Request) {
  let body: { provider?: string; email?: string; name?: string; custom?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const provider = body.provider as SocialProvider
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Unsupported sign-in provider.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required to continue.' }, { status: 400 })
  }

  // "Use another account" — create a brand-new social-linked STUDENT account.
  // (Admin roles can never be self-granted through social sign-up; the role
  // comes only from seeded club personas or a credentials signup with the
  // admin access code.)
  const isCustom = body.custom === true
  if (isCustom) {
    const name = (body.name ?? '').trim()
    if (name.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
    }
  } else {
    const known = SOCIAL_PERSONAS[provider].some((p) => p.email.toLowerCase() === email)
    if (!known) {
      return NextResponse.json(
        { error: `This email is not linked to the demo ${PROVIDER_LABEL[provider]} chooser.` },
        { status: 403 }
      )
    }
  }

  // Find the provider-linked account, or provision it on first sign-in.
  let user = await db.user.findUnique({ where: { email } })
  if (!user) {
    const persona = SOCIAL_PERSONAS[provider].find((p) => p.email.toLowerCase() === email)
    user = await db.user.create({
      data: {
        email,
        name: isCustom ? (body.name ?? '').trim() : (persona?.name ?? 'MathDuino User'),
        role: isCustom ? 'STUDENT' : (persona?.role ?? 'STUDENT'),
        provider,
        passwordHash: null,
        emailVerified: true, // social emails are verified by the provider
        status: 'ACTIVE',
        points: 220,
        bottles: 15,
        bottlesGoal: 50,
        grade: 'Grade 6',
        section: 'Sampaguita',
        rfid: null,
      },
    })
  }

  if (user.status === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'This account has been suspended — contact the Eco-Tech Club administrator.' },
      { status: 403 }
    )
  }

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
