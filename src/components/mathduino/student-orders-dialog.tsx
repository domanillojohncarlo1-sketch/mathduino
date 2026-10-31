'use client'

// ============================================================
// MathDuino — Student "My Orders" dialog
// Receipt-style tracker: every reward order with its status
// (PENDING → READY FOR PICKUP → RECEIVED) and full date/time
// timestamps for each step of the fulfilment timeline.
//
// Removal semantics (status-specific):
//   PENDING   → remove + automatic point refund (accidental redeem undo)
//   RECEIVED  → remove from history only (item already claimed)
//   CANCELLED → remove from history only (points already refunded)
//   READY     → no remove action; store admin handles those
// ============================================================

import { useState } from 'react'
import { format } from 'date-fns'
import {
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  PackageOpen,
  RefreshCw,
  Trash2,
  Undo2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SHOP_ITEMS } from '@/lib/mathduino'
import {
  isActiveStatus,
  isRemovableStatus,
  ORDER_STATUS_META,
  orderRef,
  type StudentOrder,
} from '@/lib/order-types'
import { cn } from '@/lib/utils'

/** Look up the reward-shop icon for an ordered item (falls back to Package). */
function itemIcon(name: string): LucideIcon {
  return SHOP_ITEMS.find((i) => i.name === name)?.icon ?? Package
}

function fmt(iso: string | null): string {
  return iso ? format(new Date(iso), 'MMM d, yyyy · hh:mm a') : ''
}

/** Confirmation copy per removable status — each has different consequences. */
function removeCopy(o: StudentOrder): { title: string; body: string; action: string } {
  if (o.status === 'PENDING') {
    return {
      title: `Remove ${o.itemName} and refund ${o.itemCost} PTS?`,
      body: `This pending order will be deleted and ${o.itemCost} points will be returned to your balance instantly, ready to spend again. This can't be undone.`,
      action: 'REMOVE & REFUND',
    }
  }
  if (o.status === 'RECEIVED') {
    return {
      title: `Remove ${o.itemName} from your history?`,
      body: 'This received order will be deleted from your list. Points are not refunded — the item was already claimed at the store.',
      action: 'REMOVE FROM HISTORY',
    }
  }
  return {
    title: `Remove ${o.itemName} from your history?`,
    body: `This cancelled order will be deleted from your list. Its ${o.itemCost} points were already refunded to your balance automatically when it was cancelled.`,
    action: 'REMOVE FROM HISTORY',
  }
}

interface StudentOrdersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: StudentOrder[] | null
  loading: boolean
  /** id of the order currently being removed on the server (spinner state) */
  removingId: string | null
  onRemove: (order: StudentOrder) => Promise<void> | void
  onRefresh: () => void
}

export default function StudentOrdersDialog({
  open,
  onOpenChange,
  orders,
  loading,
  removingId,
  onRemove,
  onRefresh,
}: StudentOrdersDialogProps) {
  const list = orders ?? []
  const active = list.filter((o) => isActiveStatus(o.status))
  const pending = list.filter((o) => o.status === 'PENDING').length
  const ready = list.filter((o) => o.status === 'READY').length
  const received = list.filter((o) => o.status === 'RECEIVED').length

  const [confirmOrder, setConfirmOrder] = useState<StudentOrder | null>(null)
  const confirm = confirmOrder ? removeCopy(confirmOrder) : null

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setConfirmOrder(null) }}>
      <DialogContent className="max-h-[85vh] overflow-hidden border-slate-800 bg-slate-900 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm font-bold tracking-[0.2em] text-emerald-300">
            <Package className="size-4" aria-hidden />
            MY ORDERS
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Track every reward order — pending, ready for pickup and received, with date &amp; time.
            Pending orders can be removed with a full refund.
          </DialogDescription>
        </DialogHeader>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-2" aria-label="Order summary">
          {[
            { label: 'PENDING', value: pending, icon: Clock, cls: 'text-amber-300' },
            { label: 'READY', value: ready, icon: BellRing, cls: 'text-emerald-300' },
            { label: 'RECEIVED', value: received, icon: CheckCircle2, cls: 'text-teal-300' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-center"
            >
              <s.icon className={cn('mx-auto size-3.5', s.cls)} aria-hidden />
              <p className="mt-1 font-mono text-lg font-black leading-none text-slate-100">
                {s.value}
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {active.length > 0 && (
          <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-200/90">
            <BellRing className="mr-1 inline size-3 text-emerald-300" aria-hidden />
            {ready > 0
              ? `${ready} order${ready > 1 ? 's' : ''} ready for pickup at the school store!`
              : `${pending} order${pending > 1 ? 's' : ''} being prepared — the store will update the status soon.`}
          </p>
        )}

        {/* Orders list */}
        <div className="md-scroll -mr-2 max-h-[46vh] space-y-3 overflow-y-auto pr-2" aria-live="polite">
          {loading && !orders ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-950/60" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
              <PackageOpen className="size-10 text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-300">No orders yet</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Redeem an item in the reward shop below — it will show up here with its status and
                timestamps.
              </p>
            </div>
          ) : (
            list.map((o) => {
              const Icon = itemIcon(o.itemName)
              const meta = ORDER_STATUS_META[o.status]
              const removable = isRemovableStatus(o.status)
              const busy = removingId === o.id
              return (
                <article
                  key={o.id}
                  className={cn(
                    'rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition-colors hover:border-slate-700',
                    busy && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h4 className="text-sm font-semibold text-slate-100">{o.itemName}</h4>
                        <span className="font-mono text-[10px] text-slate-500">
                          {orderRef(o.id)}
                        </span>
                      </div>
                      {/* Cost line — cancelled orders show the automatic refund instead */}
                      <p
                        className={cn(
                          'mt-0.5 flex items-center gap-1 font-mono text-[11px]',
                          o.status === 'CANCELLED' ? 'text-emerald-400/90' : 'text-emerald-300/90'
                        )}
                      >
                        {o.status === 'CANCELLED' && (
                          <Undo2 className="size-3" aria-hidden />
                        )}
                        {o.status === 'CANCELLED'
                          ? `+${o.itemCost} PTS REFUNDED`
                          : `−${o.itemCost} PTS`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('shrink-0 px-2 py-0.5 font-mono text-[9px] tracking-widest', meta.badgeClass)}
                    >
                      <span className={cn('mr-1 size-1.5 rounded-full', meta.dotClass)} aria-hidden />
                      {meta.label}
                    </Badge>
                    {removable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={removingId !== null}
                        aria-label={
                          o.status === 'PENDING'
                            ? `Remove ${o.itemName} and refund ${o.itemCost} points`
                            : `Remove ${o.itemName} from history`
                        }
                        title={
                          o.status === 'PENDING'
                            ? 'Remove & refund points'
                            : 'Remove from history'
                        }
                        onClick={() => setConfirmOrder(o)}
                        className="size-7 shrink-0 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    )}
                  </div>

                  {/* Fulfilment timeline with date & time */}
                  <dl className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-3 text-[11px]">
                    <TimelineRow
                      icon={Clock}
                      iconCls="text-slate-400"
                      label="Placed"
                      value={fmt(o.placedAt)}
                    />
                    {o.readyAt && o.status !== 'CANCELLED' && (
                      <TimelineRow
                        icon={BellRing}
                        iconCls="text-emerald-400"
                        label="Ready for pickup"
                        value={fmt(o.readyAt)}
                      />
                    )}
                    {o.receivedAt && (
                      <TimelineRow
                        icon={CheckCircle2}
                        iconCls="text-teal-400"
                        label="Received"
                        value={fmt(o.receivedAt)}
                      />
                    )}
                    {o.cancelledAt && (
                      <TimelineRow
                        icon={Undo2}
                        iconCls="text-emerald-400"
                        label="Cancelled · points refunded to balance"
                        value={fmt(o.cancelledAt)}
                      />
                    )}
                  </dl>
                </article>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
          <p className="text-[10px] text-slate-600">
            Pending orders can be removed with a full refund · claim READY orders at the store.
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 gap-1.5 font-mono text-[10px] tracking-[0.2em] text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} aria-hidden />
            REFRESH
          </Button>
        </div>
      </DialogContent>

      {/* Remove confirmation — consequences differ per status */}
      <AlertDialog open={confirmOrder !== null} onOpenChange={(o) => !o && setConfirmOrder(null)}>
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-slate-100">
              {confirm?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-slate-400">
              {confirm?.body}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100">
              KEEP ORDER
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removingId !== null}
              onClick={(e) => {
                e.preventDefault() // keep the alert dialog open until the API answers
                if (!confirmOrder) return
                const target = confirmOrder
                void Promise.resolve(onRemove(target)).finally(() => setConfirmOrder(null))
              }}
              className={cn(
                'gap-1.5 font-mono tracking-widest',
                confirmOrder?.status === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-red-500 text-slate-50 hover:bg-red-400'
              )}
            >
              {removingId !== null && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {confirm?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

function TimelineRow({
  icon: Icon,
  iconCls,
  label,
  value,
}: {
  icon: LucideIcon
  iconCls: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('size-3 shrink-0', iconCls)} aria-hidden />
      <dt className="text-slate-500">{label}</dt>
      <dd className="ml-auto font-mono text-slate-300">{value}</dd>
    </div>
  )
}
