import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import type { AdminOrder, OrderAction, OrderStats, OrderStatus } from '@/lib/order-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin(req?: Request) {
  const user = await getSessionUser(req)
  if (!user) return { error: 'Not signed in.', status: 401 as const }
  if (user.role !== 'ADMIN') return { error: 'Administrator access required.', status: 403 as const }
  return { user }
}

function serialize(
  o: {
    id: string
    itemName: string
    itemCost: number
    status: string
    placedAt: Date
    readyAt: Date | null
    receivedAt: Date | null
    cancelledAt: Date | null
    user: { id: string; name: string; email: string; rfid: string | null }
  }
): AdminOrder {
  return {
    id: o.id,
    itemName: o.itemName,
    itemCost: o.itemCost,
    status: o.status as OrderStatus,
    placedAt: o.placedAt.toISOString(),
    readyAt: o.readyAt?.toISOString() ?? null,
    receivedAt: o.receivedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    student: {
      id: o.user.id,
      name: o.user.name,
      email: o.user.email,
      rfid: o.user.rfid,
    },
  }
}

/** All reward orders across every student, newest first, with status counts. */
export async function GET(req: Request) {
  const guard = await requireAdmin(req)
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const orders = await db.order.findMany({
    orderBy: { placedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, rfid: true } },
    },
  })

  const stats: OrderStats = { PENDING: 0, READY: 0, RECEIVED: 0, CANCELLED: 0 }
  for (const o of orders) {
    if (o.status in stats) stats[o.status as OrderStatus] += 1
  }

  return NextResponse.json({ orders: orders.map(serialize), stats })
}

/**
 * Fulfilment actions from the admin:
 *   ready    → PENDING → READY FOR PICKUP
 *   received → PENDING|READY → RECEIVED (claimed at the store)
 *   cancel   → PENDING|READY → CANCELLED (points refunded to the student)
 */
export async function PATCH(req: Request) {
  const guard = await requireAdmin(req)
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  let body: { orderId?: string; action?: OrderAction }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId, action } = body
  if (!orderId || !action || !['ready', 'received', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'orderId and a valid action are required.' }, { status: 400 })
  }

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  const now = new Date()
  try {
    if (action === 'ready') {
      if (order.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Only PENDING orders can be marked ready for pickup.' },
          { status: 409 }
        )
      }
      const updated = await db.order.update({
        where: { id: order.id },
        data: { status: 'READY', readyAt: now },
        include: { user: { select: { id: true, name: true, email: true, rfid: true } } },
      })
      return NextResponse.json({ order: serialize(updated) })
    }

    if (action === 'received') {
      if (order.status !== 'PENDING' && order.status !== 'READY') {
        return NextResponse.json(
          { error: 'Only PENDING or READY orders can be marked received.' },
          { status: 409 }
        )
      }
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          status: 'RECEIVED',
          receivedAt: now,
          // Walk-up claims skip the READY step — stamp it now for a complete timeline.
          readyAt: order.readyAt ?? now,
        },
        include: { user: { select: { id: true, name: true, email: true, rfid: true } } },
      })
      return NextResponse.json({ order: serialize(updated) })
    }

    // action === 'cancel'
    if (order.status !== 'PENDING' && order.status !== 'READY') {
      return NextResponse.json(
        { error: 'Only PENDING or READY orders can be cancelled.' },
        { status: 409 }
      )
    }
    const updated = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: order.userId },
        data: { points: { increment: order.itemCost } },
      })
      return tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: now },
        include: { user: { select: { id: true, name: true, email: true, rfid: true } } },
      })
    })
    return NextResponse.json({ order: serialize(updated), refunded: order.itemCost })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Order action failed.' },
      { status: 500 }
    )
  }
}
