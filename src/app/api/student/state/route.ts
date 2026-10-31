import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, toAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lightweight live-sync poll endpoint for the student portal.
 * The web page hits this every few seconds so deposits accepted at the
 * physical MathDuino station (pushed via /api/device/events) appear here
 * without a manual refresh.
 */
export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  if (sessionUser.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student accounts only.' }, { status: 403 })
  }

  const activeOrders = await db.order.count({
    where: { userId: sessionUser.id, status: { in: ['PENDING', 'READY'] } },
  })

  return NextResponse.json({
    user: toAuthUser(sessionUser),
    activeOrders,
  })
}
