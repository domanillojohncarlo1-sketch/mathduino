/**
 * ADMIN DEMO RESET — requires an ADMIN session (cookie or bearer).
 *   POST → factory-reset the demo data in one shot:
 *     1. deletes every reward order
 *     2. deletes every account EXCEPT the two seeded demo accounts
 *        (admin@mathduino.io · student@mathduino.io) — cascades their
 *        sessions/orders via the schema's onDelete: Cascade
 *     3. resets every remaining STUDENT to 0 bottles / 0 points
 *
 * Purpose: the defense demo always starts from zero — the first
 * bottle inserted on the machine is the first point ever earned.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_EMAILS = ['admin@mathduino.io', 'student@mathduino.io']

async function requireAdmin(req?: Request) {
  const user = await getSessionUser(req)
  if (!user) return { error: 'Not signed in.', status: 401 as const }
  if (user.role !== 'ADMIN') return { error: 'Administrator access required.', status: 403 as const }
  return { user }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  // 1. Wipe the order history (points were refunded on cancel already —
  //    students go to 0 anyway, so no bookkeeping is needed here).
  const removedOrders = await db.order.deleteMany({})

  // 2. Remove every non-demo account (self-created + legacy social
  //    personas). Sessions and orders of those users cascade.
  const removedUsers = await db.user.deleteMany({
    where: { email: { notIn: DEMO_EMAILS } },
  })

  // 3. Zero every remaining student (demo student included).
  const resetStudents = await db.user.updateMany({
    where: { role: 'STUDENT' },
    data: { points: 0, bottles: 0 },
  })

  return NextResponse.json({
    ok: true,
    removedOrders: removedOrders.count,
    removedUsers: removedUsers.count,
    resetStudents: resetStudents.count,
  })
}
