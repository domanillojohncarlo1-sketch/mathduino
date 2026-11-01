import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Returns the machine-facing sync credentials so the club admin can copy them
 * into the ESP32 firmware. Server-only — the device key never ships in the
 * public client bundle; it is disclosed exclusively to verified admins.
 */
export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  if (sessionUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }

  return NextResponse.json({
    endpoint: '/api/device/events',
    method: 'POST',
    keyHeader: 'X-Device-Key',
    key: process.env.MD_DEVICE_KEY ?? 'md-station-key-2025',
    payload: { rfid: 'RF-8823-1145', type: 'recycle' },
  })
}
