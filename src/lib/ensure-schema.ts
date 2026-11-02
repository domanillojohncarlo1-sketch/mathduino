/**
 * Runtime schema bootstrap for hosted databases (Turso / libSQL).
 *
 * The Prisma schema can drift from the hosted database when a deploy adds a
 * new model but the matching `CREATE TABLE` was never pushed to the live
 * database (there is no migration step on Vercel). Instead of failing with a
 * confusing 500, the affected auth routes call this idempotent bootstrap
 * before their first passwordReset query.
 *
 * The DDL mirrors exactly what `prisma migrate diff` generates for the
 * PasswordReset model — CREATE IF NOT EXISTS, so existing data is untouched
 * and repeated calls are a no-op (cached per serverless instance).
 */
import { db } from '@/lib/db'

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
