/**
 * STUDENT EVENTS — requires a session (cookie or bearer).
 *   POST { type: "recycle", ... } → simulate a bottle deposit (+points)
 *   POST { type: "quiz", ... }    → math-quiz answer (+bonus on correct)
 * The physical machine bypasses this route: it calls /api/device/events
 * with its device key + the students RFID instead.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, toAuthUser } from '@/lib/auth'
import { BONUS_PER_CORRECT, POINTS_PER_BOTTLE } from '@/lib/mathduino'

export const runtime = 'nodejs'

/**
 * Persists portal activity for the signed-in student so points and bottles
 * survive reloads. Mirrors what the ESP32 firmware writes to its ledger:
 *
 *  - recycle → +1 bottle (capped at the weekly goal), +POINTS_PER_BOTTLE points
 *  - quiz    → +delta points (server clamps the bonus)
 *  - redeem  → −cost points (validated against the balance)
 */
export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: { type?: string; delta?: number; cost?: number; itemName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (sessionUser.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student accounts only.' }, { status: 403 })
  }

  let capped = false

  switch (body.type) {
    case 'recycle': {
      if (sessionUser.bottles >= sessionUser.bottlesGoal) {
        capped = true
        break
      }
      const user = await db.user.update({
        where: { id: sessionUser.id },
        data: {
          bottles: { increment: 1 },
          points: { increment: POINTS_PER_BOTTLE },
        },
      })
      return NextResponse.json({ user: toAuthUser(user), capped, earned: POINTS_PER_BOTTLE })
    }

    case 'quiz': {
      const delta = Math.max(0, Math.min(25, Math.round(Number(body.delta) || 0)))
      const correct = Math.round(delta / BONUS_PER_CORRECT)
      const user = await db.user.update({
        where: { id: sessionUser.id },
        data: { points: { increment: delta } },
      })
      return NextResponse.json({ user: toAuthUser(user), capped, earned: delta, correct })
    }

    default:
      // 'redeem' moved to /api/student/orders — this endpoint only handles
      // machine-side events (recycling + quiz bonuses).
      return NextResponse.json({ error: 'Unknown event type.' }, { status: 400 })
  }

  return NextResponse.json({
    user: toAuthUser(sessionUser),
    capped,
  })
}
