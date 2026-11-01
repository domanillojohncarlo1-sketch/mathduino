import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? ''

  // Hosted mode (Turso / any libSQL server): DATABASE_URL starts with libsql://
  // and is authenticated with DATABASE_AUTH_TOKEN. Used on Vercel & co.
  if (url.startsWith('libsql://')) {
    const adapter = new PrismaLibSQL({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
    return new PrismaClient({ adapter, log: ['query'] })
  }

  // Local mode: plain SQLite file (development default).
  return new PrismaClient({ log: ['query'] })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
