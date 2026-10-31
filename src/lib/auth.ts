// ============================================================
// MathDuino — server-side auth helpers
// Password hashing (scrypt) + DB-backed sessions via httpOnly cookie
// SERVER ONLY — imports node:crypto and next/headers
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { User } from '@prisma/client'
import { db } from '@/lib/db'
import type { AuthProvider, AuthUser, UserRole } from '@/lib/auth-types'

export const SESSION_COOKIE = 'md_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const SCRYPT_KEYLEN = 64

/* ---------------- Password hashing ---------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

/* ---------------- Sessions ---------------- */

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export async function destroySession(req?: Request) {
  const token = tokenFromRequest(req)
  if (token) {
    await db.session.deleteMany({ where: { token } })
    return
  }
  const jar = await cookies()
  const cookieToken = jar.get(SESSION_COOKIE)?.value
  if (cookieToken) {
    await db.session.deleteMany({ where: { token: cookieToken } })
  }
}

/**
 * Extract the session token from a request. Prefers the `Authorization:
 * Bearer <token>` header — the sandbox preview runs inside a cross-site
 * iframe where browsers drop SameSite cookies, so the client mirrors the
 * token and sends it as a header. Falls back to the httpOnly cookie for
 * regular same-origin tabs.
 */
export function tokenFromRequest(req?: Request): string | null {
  const header = req?.headers.get('authorization')
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim()
    // Session tokens are 64-char hex strings from randomBytes(32).
    if (/^[0-9a-f]{64}$/i.test(token)) return token
  }
  return null
}

/** Resolve the current authenticated user (Bearer header, then session cookie). */
export async function getSessionUser(req?: Request): Promise<User | null> {
  const headerToken = tokenFromRequest(req)
  if (headerToken) {
    return sessionUserByToken(headerToken)
  }

  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return sessionUserByToken(token)
}

async function sessionUserByToken(token: string): Promise<User | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  return session.user
}

/* ---------------- Mapping & validation ---------------- */

const PROVIDERS: AuthProvider[] = ['credentials', 'google', 'github', 'facebook']

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT') as UserRole,
    provider: (PROVIDERS.includes(user.provider as AuthProvider)
      ? user.provider
      : 'credentials') as AuthProvider,
    emailVerified: user.emailVerified,
    status: (user.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE') as AuthUser['status'],
    points: user.points,
    bottles: user.bottles,
    bottlesGoal: user.bottlesGoal,
    grade: user.grade,
    section: user.section,
    rfid: user.rfid,
    createdAt: user.createdAt.toISOString(),
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
