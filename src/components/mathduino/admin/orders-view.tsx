'use client'

// ============================================================
// MathDuino — Admin Order Management
// Fulfil every student reward order: mark ready for pickup,
// mark received, or cancel with an automatic point refund.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BellRing,
  CheckCircle2,
  ClipboardList,
  Clock,
  Package,
  PackageCheck,
  RefreshCw,
  Undo2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authRequest } from '@/lib/auth-types'
import {
  isActiveStatus,
  ORDER_STATUSES,
  ORDER_STATUS_META,
  orderRef,
  type AdminOrder,
  type OrderAction,
  type OrderStats,
  type OrderStatus,
} from '@/lib/order-types'

const fmt = (iso: string | null) => (iso ? format(new Date(iso), 'MMM d · hh:mm a') : '—')

type Filter = 'ALL' | OrderStatus

const FILTERS: Filter[] = ['ALL', ...ORDER_STATUSES]

export default function OrdersView() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [stats, setStats] = useState<OrderStats>({ PENDING: 0, READY: 0, RECEIVED: 0, CANCELLED: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(
    () => () => {
      mounted.current = false
    },
    []
  )

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const data = await authRequest<{ orders: AdminOrder[]; stats: OrderStats }>(
        '/api/admin/orders'
      )
      if (!mounted.current) return
      setOrders(data.orders)
      setStats(data.stats)
    } catch (err) {
      if (mounted.current && !quiet) {
        toast.error(err instanceof Error ? err.message : 'Could not load orders.')
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchOrders()
    // Light polling keeps the fulfilment desk in sync with new student orders.
    const t = setInterval(() => void fetchOrders(true), 20000)
    return () => clearInterval(t)
  }, [fetchOrders])

  const runAction = async (order: AdminOrder, action: OrderAction) => {
    setBusyId(order.id)
    try {
      const data = await authRequest<{ order: AdminOrder; refunded?: number }>(
        '/api/admin/orders',
        { orderId: order.id, action },
        'PATCH'
      )
      // Splice the updated order into the local list (no full refetch needed).
      setOrders((prev) =>
        prev ? prev.map((o) => (o.id === data.order.id ? data.order : o)) : [data.order]
      )
      setStats((prev) => {
        const next = { ...prev }
        if (prev[order.status] !== undefined) next[order.status] = Math.max(0, prev[order.status] - 1)
        if (next[data.order.status] !== undefined) next[data.order.status] += 1
        return next
      })
      if (action === 'ready') {
        toast.success(`${orderRef(order.id)} marked ready — ${order.student.name} can pick it up.`)
      } else if (action === 'received') {
        toast.success(`${order.itemName} handed to ${order.student.name}. Order complete.`)
      } else {
        toast.info(
          `${orderRef(order.id)} cancelled — ${data.refunded ?? order.itemCost} points refunded to ${order.student.name}.`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Order action failed.')
    } finally {
      setBusyId(null)
    }
  }

  const visible = (orders ?? []).filter((o) => filter === 'ALL' || o.status === filter)

  return (
    <section className="space-y-4" aria-labelledby="orders-heading">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="orders-heading"
          className="flex items-center gap-3 text-[11px] font-bold tracking-[0.35em] text-slate-400"
        >
          <span className="h-px w-8 bg-emerald-500/60" aria-hidden />
          ORDER MANAGEMENT
          <span className="h-px flex-1 bg-slate-800/80" aria-hidden />
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="h-8 gap-1.5 border-slate-700 font-mono text-[10px] tracking-[0.2em] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} aria-hidden />
          REFRESH
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            { key: 'PENDING', icon: Clock, cls: 'text-amber-300', hint: 'Awaiting store prep' },
            { key: 'READY', icon: BellRing, cls: 'text-emerald-300', hint: 'Waiting for pickup' },
            { key: 'RECEIVED', icon: PackageCheck, cls: 'text-teal-300', hint: 'Completed claims' },
            { key: 'CANCELLED', icon: XCircle, cls: 'text-red-300', hint: 'Refunded orders' },
          ] as Array<{ key: OrderStatus; icon: LucideIcon; cls: string; hint: string }>
        ).map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <s.icon className={cn('size-4', s.cls)} aria-hidden />
              <span className="font-mono text-[9px] tracking-[0.25em] text-slate-500">
                {s.key}
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-black leading-none text-slate-100">
              {stats[s.key]}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-500">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Filter orders by status"
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.15em] transition-colors',
              filter === f
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            )}
          >
            {f}
            <span className="ml-1.5 text-slate-500">
              {f === 'ALL' ? (orders?.length ?? 0) : stats[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="md-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Student reward orders and fulfilment actions</caption>
            <thead>
              <tr className="border-b border-slate-800 font-mono text-[10px] tracking-[0.2em] text-slate-500">
                <th scope="col" className="px-4 py-3 font-semibold">ORDER</th>
                <th scope="col" className="px-4 py-3 font-semibold">STUDENT</th>
                <th scope="col" className="px-4 py-3 font-semibold">COST</th>
                <th scope="col" className="px-4 py-3 font-semibold">STATUS</th>
                <th scope="col" className="px-4 py-3 font-semibold">TIMELINE</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && !orders ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/60">
                    <td colSpan={6} className="px-4 py-5">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-800/60" aria-busy="true" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <ClipboardList className="mx-auto size-8 text-slate-700" aria-hidden />
                    <p className="mt-2 text-sm text-slate-400">No orders match this filter.</p>
                    <p className="text-xs text-slate-600">
                      Student orders from the reward shop will appear here in real time.
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((o) => {
                  const meta = ORDER_STATUS_META[o.status]
                  const busy = busyId === o.id
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/30"
                    >
                      {/* ORDER */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                            <Package className="size-4" aria-hidden />
                          </span>
                          <div className="leading-tight">
                            <p className="text-[13px] font-semibold text-slate-100">{o.itemName}</p>
                            <p className="font-mono text-[10px] text-slate-500">{orderRef(o.id)}</p>
                          </div>
                        </div>
                      </td>
                      {/* STUDENT */}
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-medium text-slate-200">{o.student.name}</p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {o.student.rfid ?? o.student.email}
                        </p>
                      </td>
                      {/* COST */}
                      <td className="px-4 py-3.5 font-mono text-[13px] font-bold text-emerald-300">
                        {o.itemCost}
                      </td>
                      {/* STATUS */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-2 py-0.5 font-mono text-[9px] tracking-widest',
                            meta.badgeClass
                          )}
                        >
                          <span className={cn('mr-1 size-1.5 rounded-full', meta.dotClass)} aria-hidden />
                          {o.status}
                        </Badge>
                      </td>
                      {/* TIMELINE */}
                      <td className="px-4 py-3.5">
                        <dl className="space-y-1 text-[10px] leading-tight">
                          <div className="flex gap-1.5">
                            <dt className="text-slate-500">Placed</dt>
                            <dd className="font-mono text-slate-300">{fmt(o.placedAt)}</dd>
                          </div>
                          {o.readyAt && o.status !== 'CANCELLED' && (
                            <div className="flex gap-1.5">
                              <dt className="text-slate-500">Ready</dt>
                              <dd className="font-mono text-emerald-300/90">{fmt(o.readyAt)}</dd>
                            </div>
                          )}
                          {o.receivedAt && (
                            <div className="flex gap-1.5">
                              <dt className="text-slate-500">Received</dt>
                              <dd className="font-mono text-teal-300/90">{fmt(o.receivedAt)}</dd>
                            </div>
                          )}
                          {o.cancelledAt && (
                            <div className="flex gap-1.5">
                              <dt className="text-slate-500">Cancelled</dt>
                              <dd className="font-mono text-red-300/90">{fmt(o.cancelledAt)}</dd>
                            </div>
                          )}
                        </dl>
                      </td>
                      {/* ACTIONS */}
                      <td className="px-4 py-3.5">
                        {isActiveStatus(o.status) ? (
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {o.status === 'PENDING' && (
                              <Button
                                size="sm"
                                disabled={busyId !== null}
                                onClick={() => void runAction(o, 'ready')}
                                className="h-8 gap-1 bg-emerald-500 px-2.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                              >
                                <BellRing className="size-3" aria-hidden />
                                MARK READY
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId !== null}
                              onClick={() => void runAction(o, 'received')}
                              className="h-8 gap-1 border-teal-500/40 px-2.5 text-[11px] font-bold text-teal-300 hover:bg-teal-500/10 hover:text-teal-200"
                            >
                              <CheckCircle2 className="size-3" aria-hidden />
                              RECEIVED
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId !== null}
                              onClick={() => void runAction(o, 'cancel')}
                              className="h-8 gap-1 px-2.5 text-[11px] font-bold text-red-300/90 hover:bg-red-500/10 hover:text-red-200"
                            >
                              <Undo2 className="size-3" aria-hidden />
                              CANCEL
                            </Button>
                          </div>
                        ) : (
                          <p className="text-right font-mono text-[10px] tracking-[0.2em] text-slate-600">
                            NO ACTION
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-600">
        Cancelling an active order automatically refunds its points to the student&apos;s balance.
        Auto-syncs every 20s.
      </p>
    </section>
  )
}
