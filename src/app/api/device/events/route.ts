import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toAuthUser } from '@/lib/auth'
import { POINTS_PER_BOTTLE } from '@/lib/mathduino'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * MACHINE-FACING ENDPOINT — called by the physical MathDuino ESP32 station
 * whenever it accepts a bottle (student scanned their RFID card at the machine).
 *
 * Auth: `X-Device-Key` header must match MD_DEVICE_KEY (see .env.example).
 * The admin can read the current endpoint + key from Hardware Config.
 *
 * Request:  { "rfid": "RF-8823-1145", "type": "recycle" }
 * Response: { "user": AuthUser, "lcd": { "line1", "line2" }, "capped": boolean }
 *
 * `lcd` carries the exact 16-character strings the firmware should draw on
 * LCD 1, so the web and the device always mirror the same message.
 */
export async function POST(req: Request) {
  const deviceKey = process.env.MD_DEVICE_KEY ?? 'md-station-key-2025'
  if (req.headers.get('x-device-key') !== deviceKey) {
    return NextResponse.json({ error: 'Invalid device key.' }, { status: 401 })
  }

  let body: { rfid?: string; type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rfid = (body.rfid ?? '').trim().toUpperCase()
  if (!rfid || body.type !== 'recycle') {
    return NextResponse.json(
      { error: 'rfid and type:"recycle" are required.' },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({ where: { rfid } })
  if (!user) {
    return NextResponse.json({ error: 'Unknown RFID card.' }, { status: 404 })
  }
  if (user.status === 'SUSPENDED') {
    return NextResponse.json(
      {
        user: toAuthUser(user),
        lcd: { line1: 'CARD BLOCKED', line2: 'SEE ADMIN' },
        capped: false,
      },
      { status: 403 }
    )
  }

  // Weekly goal cap — same rule as the web portal's recycle event.
  if (user.bottles >= user.bottlesGoal) {
    return NextResponse.json({
      user: toAuthUser(user),
      lcd: { line1: 'GOAL REACHED!', line2: 'AWESOME WORK!' },
      capped: true,
    })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      bottles: { increment: 1 },
      points: { increment: POINTS_PER_BOTTLE },
    },
  })

  const bottles = updated.bottles
  const goal = updated.bottlesGoal
  return NextResponse.json({
    user: toAuthUser(updated),
    lcd: {
      line1: 'BOTTLE ACCEPTED',
      line2: `+${POINTS_PER_BOTTLE} PTS ${bottles}/${goal}`,
    },
    capped: bottles >= goal,
  })
}
