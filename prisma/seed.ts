// ============================================================
// MathDuino — database seed
// Run: bun prisma/seed.ts
// Creates demo credential accounts + social sign-in personas.
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

interface SeedUser {
  email: string
  name: string
  role: 'STUDENT' | 'ADMIN'
  provider: string
  password?: string
  points?: number
  bottles?: number
  grade?: string
  section?: string
  rfid?: string
}

const USERS: SeedUser[] = [
  // Credential demo accounts (shown on the auth screen)
  {
    email: 'admin@mathduino.io',
    name: 'Engr. Mario Santos',
    role: 'ADMIN',
    provider: 'credentials',
    password: DEMO_PASSWORD_ADMIN,
  },
  {
    email: 'student@mathduino.io',
    name: 'Juan Dela Cruz',
    role: 'STUDENT',
    provider: 'credentials',
    password: DEMO_PASSWORD_STUDENT,
    points: 220,
    bottles: 15,
    grade: 'Grade 6',
    section: 'Sampaguita',
    rfid: 'RF-8823-1145',
  },
  // Google personas
  {
    email: 'alex.rivera@gmail.com',
    name: 'Alex Rivera',
    role: 'STUDENT',
    provider: 'google',
    points: 145,
    bottles: 9,
    grade: 'Grade 6',
    section: 'Acacia',
    rfid: 'RF-5521-9903',
  },
  { email: 'ma.santos@gmail.com', name: 'Ma. Cristina Santos', role: 'ADMIN', provider: 'google' },
  // GitHub personas
  {
    email: 'alex.dev@users.noreply.github.com',
    name: 'Alex Rivera',
    role: 'STUDENT',
    provider: 'github',
    points: 80,
    bottles: 5,
    grade: 'Grade 5',
    section: 'Molave',
    rfid: 'RF-3310-8827',
  },
  { email: 'md.admin@users.noreply.github.com', name: 'MD Club Admin', role: 'ADMIN', provider: 'github' },
  // Facebook personas
  {
    email: 'alex.rivera@facebook.com',
    name: 'Alex Rivera',
    role: 'STUDENT',
    provider: 'facebook',
    points: 300,
    bottles: 21,
    grade: 'Grade 6',
    section: 'Sampaguita',
    rfid: 'RF-7745-1120',
  },
  { email: 'maria.santos@facebook.com', name: 'Maria Santos', role: 'ADMIN', provider: 'facebook' },
]

async function main() {
  for (const u of USERS) {
    const data = {
      email: u.email,
      name: u.name,
      role: u.role,
      provider: u.provider,
      passwordHash: u.password ? hashPassword(u.password) : null,
      emailVerified: true,
      status: 'ACTIVE',
      points: u.points ?? (u.role === 'ADMIN' ? 0 : 220),
      bottles: u.bottles ?? (u.role === 'ADMIN' ? 0 : 15),
      bottlesGoal: 50,
      grade: u.grade ?? null,
      section: u.section ?? null,
      rfid: u.rfid ?? null,
    }
    await db.user.upsert({
      where: { email: u.email },
      update: {
        name: data.name,
        role: data.role,
        provider: data.provider,
        emailVerified: true,
        status: 'ACTIVE',
        grade: data.grade,
        section: data.section,
        rfid: data.rfid,
      },
      create: data,
    })
    console.log(`seeded ${u.role.padEnd(7)} ${u.provider.padEnd(11)} ${u.email}`)
  }

  // ---- Sample orders for the demo student (only if they have none) ----
  const demoStudent = await db.user.findUnique({ where: { email: 'student@mathduino.io' } })
  if (demoStudent) {
    const existing = await db.order.count({ where: { userId: demoStudent.id } })
    if (existing === 0) {
      const now = Date.now()
      const orders = [
        {
          itemName: 'Eco-Notebook',
          itemCost: 120,
          status: 'RECEIVED',
          placedAt: new Date(now - 3 * 86400000),
          readyAt: new Date(now - 2.8 * 86400000),
          receivedAt: new Date(now - 2.5 * 86400000),
        },
        {
          itemName: 'Bamboo Ruler',
          itemCost: 60,
          status: 'READY',
          placedAt: new Date(now - 86400000),
          readyAt: new Date(now - 3 * 3600000),
        },
        {
          itemName: 'Custom Pencil',
          itemCost: 50,
          status: 'PENDING',
          placedAt: new Date(now - 2 * 3600000),
        },
      ]
      for (const o of orders) {
        await db.order.create({ data: { ...o, userId: demoStudent.id } })
      }
      console.log(`seeded ${orders.length} sample orders for ${demoStudent.email}`)
    }
  }

  console.log(`\nDone — ${USERS.length} accounts ready.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
