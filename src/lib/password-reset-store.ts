/**
 * Password reset code store — implemented in RAW SQL on purpose.
 *
 * The generated Prisma client only exposes model delegates that existed when
 * `prisma generate` last ran. On hosted builds (Vercel) the client can be
 * stale — e.g. `db.passwordReset` is undefined when node_modules was cached
 * from before the PasswordReset model was added — which crashes every
 * delegate-based call. Raw SQL bypasses the generated client entirely, so
 * this store works no matter how old the deployed client is.
 *
 * The PasswordReset table itself is created on first use (see ensureTable),
 * mirroring exactly what `prisma migrate diff` generates for the model.
 */
import { randomInt, randomUUID } from 'node:crypto'
import { db } from '@/lib/db'

const CODE_TTL_MINUTES = 15

let ensured: Promise<void> | null = null

const PASSWORD_RESET_DDL = `
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
`

/** Create the table if the hosted DB predates it (no-op otherwise, cached). */
export function ensurePasswordResetTable(): Promise<void> {
  if (!ensured) {
    ensured = db.$executeRawUnsafe(PASSWORD_RESET_DDL).then(
      () => undefined,
      (error) => {
        // Allow a retry on the next request instead of caching the failure.
        ensured = null
        throw error
      }
    )
  }
  return ensured
}

export interface IssuedCode {
  code: string
  expiresInMin: number
}

/**
 * Issue a fresh 6-digit reset code for the account. One live code per
 * account — older codes become invalid immediately, exactly like the
 * delegate-based version.
 */
export async function issueResetCode(userId: string): Promise<IssuedCode> {
  const code = String(randomInt(100000, 1000000))
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000)

  await db.$executeRawUnsafe(
    `DELETE FROM "PasswordReset" WHERE "userId" = ?`,
    userId
  )
  await db.$executeRawUnsafe(
    `INSERT INTO "PasswordReset" ("id", "userId", "code", "expiresAt", "createdAt")
     VALUES (?, ?, ?, ?, ?)`,
    randomUUID(),
    userId,
    code,
    expiresAt.toISOString(),
    now.toISOString()
  )

  return { code, expiresInMin: CODE_TTL_MINUTES }
}

export interface StoredCode {
  code: string
  expiresAt: Date
}

/** Latest outstanding reset code for the account, or null when none exists. */
export async function findLatestResetCode(userId: string): Promise<StoredCode | null> {
  const rows = await db.$queryRawUnsafe<Array<{ code: string; expiresAt: string | Date }>>(
    `SELECT "code", "expiresAt" FROM "PasswordReset"
     WHERE "userId" = ?
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    userId
  )
  const row = rows[0]
  if (!row) return null
  return { code: row.code, expiresAt: new Date(row.expiresAt) }
}

/** Consume every outstanding reset code for the account. */
export async function deleteResetCodes(userId: string): Promise<void> {
  await db.$executeRawUnsafe(`DELETE FROM "PasswordReset" WHERE "userId" = ?`, userId)
}
