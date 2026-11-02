// ============================================================
// MathDuino — shared auth types & constants (client-safe)
// Used by both API routes (server) and UI components (client).
// ============================================================

export type UserRole = 'STUDENT' | 'ADMIN'

/** Providers an account may have been created with (legacy social accounts). */
export type SocialProvider = 'google' | 'github' | 'facebook'

export type AuthProvider = 'credentials' | SocialProvider

export type UserStatus = 'ACTIVE' | 'SUSPENDED'

/** The verified session user returned by every auth endpoint. */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  provider: AuthProvider
  emailVerified: boolean
  status: UserStatus
  points: number
  bottles: number
  bottlesGoal: number
  grade: string | null
  section: string | null
  rfid: string | null
  createdAt: string
}

/** Standard error payload returned by auth endpoints: { error: string } */
export interface AuthErrorResponse {
  error: string
}

/* ------------------------------------------------------------
 * Role verification
 * ------------------------------------------------------------ */

/**
 * Access code required to create an ADMIN account (the admin
 * create-account form is separate from the student one).
 * In production this would be an email-domain check / invite link;
 * the demo uses a shared club code shown on the admin sign-up card.
 */
export const ADMIN_ACCESS_CODE = 'MD-ADMIN-2025'

/* ------------------------------------------------------------
 * Demo quick-fill credentials (seeded accounts)
 * Accounts are pre-provisioned via prisma/seed.ts. New accounts
 * (student or admin) can also be created from the auth screen.
 * ------------------------------------------------------------ */

export const DEMO_ACCOUNTS = {
  student: { email: 'student@mathduino.io', password: 'student123' },
  admin: { email: 'admin@mathduino.io', password: 'admin123' },
} as const

/* ------------------------------------------------------------
 * Client helpers
 * ------------------------------------------------------------ */

/**
 * Session-token mirror (localStorage).
 *
 * The app also runs inside the sandbox preview iframe, which is a cross-site
 * context — browsers drop SameSite cookies there, so the httpOnly session
 * cookie alone cannot keep the user signed in. Auth endpoints therefore also
 * return the session token in the response body; we persist it here and send
 * it as `Authorization: Bearer <token>` on every request. Regular tabs keep
 * using the cookie; both transports resolve the same server session.
 */
const SESSION_TOKEN_KEY = 'md_session_token'

export function saveSessionToken(token: string): void {
  try {
    window.localStorage.setItem(SESSION_TOKEN_KEY, token)
  } catch {
    // Private mode / storage disabled — the cookie still works in normal tabs.
  }
}

export function clearSessionToken(): void {
  try {
    window.localStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    // ignore — nothing else to do
  }
}

function storedSessionToken(): string | null {
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

/** Display initials for avatars ("Juan Dela Cruz" → "JD"). */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** First name for greetings. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/**
 * Parse the body of an API call; throws with a readable message on failure.
 * Automatically attaches the mirrored session token as a Bearer header and
 * persists tokens returned by auth endpoints (login).
 */
export async function authRequest<T>(
  url: string,
  body?: unknown,
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
): Promise<T> {
  const m = method ?? (body === undefined ? 'GET' : 'POST')
  const token = storedSessionToken()
  const headers: Record<string, string> = {}
  if (m !== 'GET') headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method: m,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: m === 'GET' ? undefined : JSON.stringify(body ?? {}),
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: string; token?: string }) | null
  if (!res.ok) {
    // The server no longer knows this session (expired / revoked) — drop the
    // mirror so stale tokens don't keep travelling with new requests.
    if (res.status === 401 && data?.error === 'Not signed in.') {
      clearSessionToken()
    }
    throw new Error(data?.error ?? `Request failed (${res.status})`)
  }
  // Auth endpoints return { user, token } — mirror the fresh token for the
  // Bearer-header fallback used inside the preview iframe.
  if (typeof data?.token === 'string' && data.token) {
    saveSessionToken(data.token)
  }
  return data as T
}
