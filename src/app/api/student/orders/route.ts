import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, toAuthUser } from '@/lib/auth'
import type { OrderStatus } from '@/lib/order-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OrderWithStatus = {
  id: string
  itemName: string
  itemCost: number
  status: string
  placedAt: Date
  readyAt: Date | null
  receivedAt: Date | null
  cancelledAt: Date | null
}

function serialize(o: OrderWithStatus) {
  return {
    id: o.id,
    itemName: o.itemName,
    itemCost: o.itemCost,
    status: o.status as OrderStatus,
    placedAt: o.placedAt.toISOString(),
    readyAt: o.readyAt?.toISOString() ?? null,
    receivedAt: o.receivedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
  }
}

/** List the signed-in student's orders, newest first. */
export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const orders = await db.order.findMany({
    where: { userId: sessionUser.id },
    orderBy: { placedAt: 'desc' },
  })

  return NextResponse.json({ orders: orders.map(serialize) })
}

/**
 * Student-side order removal (status-specific semantics):
 *
 *  - PENDING   → the order is deleted AND its cost is refunded to the student's
 *                balance (undo an accidental redemption, points spendable again)
 *  - CANCELLED → history cleanup only; points were already refunded
 *                automatically when the admin cancelled the order
 *  - RECEIVED  → history cleanup only; the item was already claimed — no refund
 *  - READY     → rejected; a ready-for-pickup order can only be cancelled by
 *                the store admin from the Order Management view
 */
export async function DELETE(req: Request) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  if (sessionUser.role !== 'STUDENT') {
    return NextResponse.json(
      { error: 'Only student accounts can remove their orders.' },
      { status: 403 }
    )
  }

  let body: { orderId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const orderId = (body.orderId ?? '').trim()
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 })
  }

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== sessionUser.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.status === 'READY') {
    return NextResponse.json(
      {
        error:
          'This order is ready for pickup — only the store admin can cancel it. Please claim it at the store.',
      },
      { status: 409 }
    )
  }

  if (order.status === 'PENDING') {
    // Atomic: remove the order and put the points back in one transaction.
    const user = await db.$transaction(async (tx) => {
      await tx.order.delete({ where: { id: order.id } })
      return tx.user.update({
        where: { id: sessionUser.id },
        data: { points: { increment: order.itemCost } },
      })
    })
    return NextResponse.json({
      ok: true,
      refunded: order.itemCost,
      user: toAuthUser(user),
    })
  }

  // RECEIVED / CANCELLED → plain history cleanup, no balance change.
  await db.order.delete({ where: { id: order.id } })
  return NextResponse.json({ ok: true, refunded: 0, user: toAuthUser(sessionUser) })
}

/**
 * Place a reward order. Atomically verifies the point balance, deducts the
 * cost and creates the PENDING order for the school store to fulfil.
 */
export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  if (sessionUser.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only student accounts can place orders.' }, { status: 403 })
  }

  let body: { itemName?: string; cost?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const itemName = (body.itemName ?? '').trim()
  const cost = Math.round(Number(body.cost) || 0)
  if (itemName.length < 2 || cost <= 0) {
    return NextResponse.json({ error: 'Invalid order item.' }, { status: 400 })
  }

  // Atomic: re-check balance inside the transaction so two tabs can't
  // both spend the same points.
  try {
    const result = await db.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: sessionUser.id } })
      if (!fresh) throw new Error('Account not found.')
      if (fresh.points < cost) {
        throw new Error(`Not enough points — you need ${cost - fresh.points} more.`)
      }

      const updated = await tx.user.update({
        where: { id: fresh.id },
        data: { points: { decrement: cost } },
      })
      const order = await tx.order.create({
        data: { userId: fresh.id, itemName, itemCost: cost, status: 'PENDING' },
      })
      return { updated, order }
    })

    return NextResponse.json({
      order: serialize(result.order),
      user: toAuthUser(result.updated),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not place order.' },
      { status: 400 }
    )
  }
}
