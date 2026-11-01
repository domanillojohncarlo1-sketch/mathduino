// ============================================================
// MathDuino — push the Prisma schema to a Turso (libSQL) database
// Run:  bun run db:push:turso
// Needs TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in the environment
// (or in .env). Creates all tables; existing data is untouched.
// ============================================================

import { execSync } from 'node:child_process'
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (!url || !token) {
  console.error(
    'Missing Turso credentials.\n' +
      'Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (env or .env), e.g.:\n' +
      '  TURSO_DATABASE_URL="libsql://mathduino-yourname.turso.io"\n' +
      '  TURSO_AUTH_TOKEN="eyJ..."'
  )
  process.exit(1)
}

console.log('Generating SQL from prisma/schema.prisma …')
const sql = execSync(
  'bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
  { encoding: 'utf8' }
)

console.log(`Connecting to ${url} …`)
const client = createClient({ url, authToken: token })

await client.executeMultiple(sql)
console.log('✓ Schema pushed — all tables created in Turso.')
console.log('  Tip: users can now sign up in the app itself (admin: MD-ADMIN-2025).')
