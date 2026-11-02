// ============================================================
// MathDuino — database seed (FACTORY RESET)
// Run: bun prisma/seed.ts
//
// Leaves the database in the exact state the defense demo needs:
//   · exactly TWO accounts — the seeded student + admin
//     (every other account is removed, incl. social personas)
//   · student starts at 0 bottles / 0 points
//   · zero reward orders — the first inserted bottle is the
//     first point ever earned
// ============================================================

import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

const DEMO_PASSWORD_STUDENT = 'student123'
const DEMO_PASSWORD_ADMIN = 'admin123'

const DEMO_EMAILS = ['admin@mathduino.io', 'student@mathduino.io']

const USERS = [
  {
    email: 'admin@mathduino.io',
    name: 'Engr. Mario Santos',
    role: 'ADMIN',
    provider: 'credentials',
    password: DEMO_PASSWORD_ADMIN,
    points: 0,
    bottles: 0,
  },
  {
    email: 'student@mathduino.io',
    name: 'Juan Dela Cruz',
    role: 'STUDENT',
    provider: 'credentials',
    password: DEMO_PASSWORD_STUDENT,
    points: 0,
    bottles: 0,
    grade: 'Grade 6',
    section: 'Sampaguita',
    rfid: 'RF-8823-1145',
  },
] as const

async function main() {
  // ---- 1. Wipe everything that is not part of the zero-state ----
  const orders = await db.order.deleteMany({})
  const staleSessions = await db.session.deleteMany({
    where: { user: { email: { notIn: [...DEMO_EMAILS] } } },
  })
  const removedUsers = await db.user.deleteMany({
    where: { email: { notIn: [...DEMO_EMAILS] } },
  })
  console.log(
    `cleared ${orders.count} order(s), ${staleSessions.count} stale session(s), ` +
      `${removedUsers.count} non-demo account(s)`
  )

  // ---- 2. Upsert the two demo accounts (points/bottles forced to 0) ----
  for (const u of USERS) {
    const data = {
      email: u.email,
      name: u.name,
      role: u.role,
      provider: u.provider,
      passwordHash: 'password' in u && u.password ? hashPassword(u.password) : null,
      emailVerified: true,
      status: 'ACTIVE',
      points: u.points,
      bottles: u.bottles,
      bottlesGoal: 50,
      grade: 'grade' in u ? (u.grade ?? null) : null,
      section: 'section' in u ? (u.section ?? null) : null,
      rfid: 'rfid' in u ? (u.rfid ?? null) : null,
    }
    await db.user.upsert({
      where: { email: u.email },
      update: {
        name: data.name,
        role: data.role,
        provider: data.provider,
        emailVerified: true,
        status: 'ACTIVE',
        points: data.points,
        bottles: data.bottles,
        bottlesGoal: data.bottlesGoal,
        grade: data.grade,
        section: data.section,
        rfid: data.rfid,
      },
      create: data,
    })
    console.log(`seeded ${u.role.padEnd(7)} ${u.email}`)
  }

  console.log(`\nDone — factory zero-state ready (${USERS.length} accounts, 0 bottles, 0 points, 0 orders).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
