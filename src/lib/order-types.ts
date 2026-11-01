// ============================================================
// MathDuino — shared order types & helpers (client-safe)
// Used by the student "My Orders" dialog and the admin
// Order Management view, plus their API routes.
// ============================================================

export type OrderStatus = 'PENDING' | 'READY' | 'RECEIVED' | 'CANCELLED'

export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'READY', 'RECEIVED', 'CANCELLED']

/** Order as seen by the student who placed it. */
export interface StudentOrder {
  id: string
  itemName: string
  itemCost: number
  status: OrderStatus
  placedAt: string
  readyAt: string | null
  receivedAt: string | null
  cancelledAt: string | null
}

/** Order as seen by an administrator (includes the student identity). */
export interface AdminOrder extends StudentOrder {
  student: {
    id: string
    name: string
    email: string
    rfid: string | null
  }
}

export interface OrderStats {
  PENDING: number
  READY: number
  RECEIVED: number
  CANCELLED: number
}

/** Badge styling per status — matches the slate/emerald portal theme. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: 'PENDING',
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    dotClass: 'bg-amber-400',
  },
  READY: {
    label: 'READY FOR PICKUP',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    dotClass: 'bg-emerald-400',
  },
  RECEIVED: {
    label: 'RECEIVED',
    badgeClass: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
    dotClass: 'bg-teal-400',
  },
  CANCELLED: {
    label: 'CANCELLED',
    badgeClass: 'border-red-500/40 bg-red-500/10 text-red-300',
    dotClass: 'bg-red-400',
  },
}

/** Orders that still need action from the school store. */
export const isActiveStatus = (s: OrderStatus) => s === 'PENDING' || s === 'READY'

/**
 * Orders the student can remove from their list:
 *  - PENDING   → removed with an automatic point refund (accidental redemption)
 *  - RECEIVED  → removed from history only (item already claimed)
 *  - CANCELLED → removed from history only (points already refunded on cancel)
 * READY orders are excluded — only the store admin can act on those.
 */
export const isRemovableStatus = (s: OrderStatus) =>
  s === 'PENDING' || s === 'RECEIVED' || s === 'CANCELLED'

/** Short human-facing order reference from the cuid. */
export const orderRef = (id: string) => `#MD-${id.slice(-5).toUpperCase()}`

/** POST /api/admin/orders action discriminator. */
export type OrderAction = 'ready' | 'received' | 'cancel'
