// ============================================================
// MathDuino — push the Prisma schema to a Turso (libSQL) database
// Run:  bun run db:push:turso
//
// Needs Turso credentials in the environment (or .env), either pair works:
//   TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//   DATABASE_URL (libsql://…) + DATABASE_AUTH_TOKEN   ← same names as Vercel
//
// IDEMPOTENT: the generated DDL is rewritten to CREATE … IF NOT EXISTS, so
// existing tables/indexes are left untouched and only missing objects (e.g. a
// newly added model) are created. Safe to run on the live database.
// ============================================================

import { execSync } from 'node:child_process'
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? ''
const token = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN ?? ''

if (!url.startsWith('libsql://') || !token) {
  console.error(
    'Missing Turso credentials.\n' +
      'Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (or DATABASE_URL +\n' +
      'DATABASE_AUTH_TOKEN, the same names used on Vercel) in the env or .env:\n' +
      '  TURSO_DATABASE_URL="libsql://mathduino-yourname.turso.io"\n' +
      '  TURSO_AUTH_TOKEN="eyJ..."'
  )
  process.exit(1)
}

console.log('Generating SQL from prisma/schema.prisma …')
const raw = execSync(
  'bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
  { encoding: 'utf8' }
)

// Make the DDL idempotent — skip every object that already exists so the
// script can be re-run on the live database without errors or data changes.
const sql = raw.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ').replace(
  /CREATE (UNIQUE )?INDEX /g,
  'CREATE $1INDEX IF NOT EXISTS '
)

console.log(`Connecting to ${url} …`)
const client = createClient({ url, authToken: token })

await client.executeMultiple(sql)
console.log('✓ Schema pushed — missing tables created, existing data untouched.')
console.log('  Tip: the PasswordReset table backs the Forgot password demo flow.')
