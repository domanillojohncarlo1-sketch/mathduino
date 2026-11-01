'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Coins,
  Flame,
  LogOut,
  Monitor,
  Package,
  Recycle,
  ShieldCheck,
  Trophy,
  Zap,
} from 'lucide-react'
import LcdScreen from '@/components/mathduino/shared/lcd-screen'
import QuizPanel from './quiz-panel'
import RewardShop from './reward-shop'
import StudentOrdersDialog from './orders-dialog'
import {
  BONUS_PER_CORRECT,
  POINTS_PER_BOTTLE,
  SHOP_ITEMS,
  type ShopItem,
} from '@/lib/mathduino'
import {
  authRequest,
  initialsOf,
  type AuthUser,
} from '@/lib/auth-types'
import { isActiveStatus, isRemovableStatus, type StudentOrder } from '@/lib/order-types'

interface StudentPortalProps {
  /** Verified session user (role STUDENT). */
  user: AuthUser
  /** End the session and return to the auth gate. */
  onLogout: () => void
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[11px] font-bold tracking-[0.35em] text-slate-400">
      <span className="h-px w-8 bg-emerald-500/60" aria-hidden />
      {children}
      <span className="h-px flex-1 bg-slate-800/80" aria-hidden />
    </h2>
  )
}

export default function StudentPortal({ user, onLogout }: StudentPortalProps) {
  const goal = user.bottlesGoal
  const [points, setPoints] = useState(user.points)
  const [bottles, setBottles] = useState(user.bottles)
  const [flash, setFlash] = useState<{ l1: string; l2: string } | null>(null)
  const [stock, setStock] = useState<Record<string, number>>(
    () => Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i.stock]))
  )

  // ---- Order tracking ----
  const [orders, setOrders] = useState<StudentOrder[] | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const data = await authRequest<{ orders: StudentOrder[] }>('/api/student/orders')
      setOrders(data.orders)
    } catch {
      // Keep any existing list; the dialog shows a refresh button on failure.
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  const activeOrders = (orders ?? []).filter((o) => isActiveStatus(o.status)).length

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    []
  )

  /** Temporarily override both LCDs with an event message (like the real firmware does). */
  const flashLcd = (l1: string, l2: string) => {
    setFlash({ l1, l2 })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 3000)
  }

  /**
   * Live sync with the server truth.
   *
   * The physical MD-01 station posts accepted bottles to /api/device/events;
   * this portal polls /api/student/state every few seconds so those machine
   * deposits (and admin fulfilment changes) appear here without a refresh.
   * While a local action is in flight its optimistic state is protected.
   */
  const inFlightRef = useRef(false)
  const bottlesRef = useRef(bottles)
  const pointsRef = useRef(points)
  const activeOrdersRef = useRef<number | null>(null)
  bottlesRef.current = bottles
  pointsRef.current = points

  useEffect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped || inFlightRef.current) return
      if (document.visibilityState !== 'visible') return
      try {
        const data = await authRequest<{ user: AuthUser; activeOrders: number }>(
          '/api/student/state'
        )
        if (stopped || inFlightRef.current) return

        // A bottle accepted at the physical station while we watched?
        if (data.user.bottles > bottlesRef.current) {
          const gained = data.user.bottles - bottlesRef.current
          const earned = data.user.points - pointsRef.current
          flashLcd(
            'BOTTLE SYNCED!',
            `+${POINTS_PER_BOTTLE} · ${data.user.bottles}/${goal}`
          )
          toast.success(
            `MD-01 accepted ${gained} bottle${gained > 1 ? 's' : ''} — +${earned} points synced!`
          )
        }
        setPoints(data.user.points)
        setBottles(data.user.bottles)

        // Admin moved an order along (ready / received / cancelled)?
        if (activeOrdersRef.current !== null && data.activeOrders !== activeOrdersRef.current) {
          void fetchOrders()
        }
        activeOrdersRef.current = data.activeOrders
      } catch {
        // Session may have expired or network hiccup — retry on next tick.
      }
    }
    const id = setInterval(tick, 4000)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [goal, fetchOrders])

  /** Push a portal event to the API so points/bottles persist across sessions. */
  const syncEvent = async (payload: Record<string, unknown>) => {
    inFlightRef.current = true
    try {
      return await authRequest<{
        user: AuthUser
        capped?: boolean
        earned?: number
      }>('/api/student/events', payload)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sync — points not saved.')
      return null
    } finally {
      inFlightRef.current = false
    }
  }

  const depositBottle = async () => {
    if (bottles >= goal) {
      flashLcd('GOAL REACHED!', 'AWESOME WORK!')
      toast.info('Weekly goal already reached — awesome work!')
      return
    }
    const next = bottles + 1
    setBottles(next)
    setPoints((p) => p + POINTS_PER_BOTTLE)
    const data = await syncEvent({ type: 'recycle' })
    if (!data) {
      // Roll the optimistic update back if the server refused.
      setBottles(bottles)
      setPoints((p) => p - POINTS_PER_BOTTLE)
      return
    }
    if (next >= goal) {
      flashLcd('GOAL REACHED!', 'AWESOME WORK!')
      toast.success(`Weekly goal reached — ${goal} bottles collected!`)
    } else {
      flashLcd('BOTTLE ACCEPTED', `+${POINTS_PER_BOTTLE} PTS · ${next}/${goal}`)
      toast.success(`+${POINTS_PER_BOTTLE} points — bottle accepted!`)
    }
  }

  const handleQuizFinish = (correct: number) => {
    const bonus = correct * BONUS_PER_CORRECT
    if (bonus > 0) {
      setPoints((p) => p + bonus)
      flashLcd('PRACTICE DONE', `BONUS +${bonus} PTS`)
      toast.success(`Practice complete: +${bonus} bonus points!`)
      void syncEvent({ type: 'quiz', delta: bonus })
    } else {
      flashLcd('PRACTICE DONE', 'TRY AGAIN!')
      toast.info('Practice complete — try again for bonus points!')
    }
  }

  const redeem = async (item: ShopItem) => {
    if (points < item.points) return
    inFlightRef.current = true
    try {
      // Server verifies balance atomically, deducts points and creates the
      // PENDING order for the school store to fulfil.
      const data = await authRequest<{ order: StudentOrder; user: AuthUser }>(
        '/api/student/orders',
        { itemName: item.name, cost: item.points }
      )
      setPoints(data.user.points)
      setStock((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))
      setOrders((prev) => [data.order, ...(prev ?? [])])
      activeOrdersRef.current = null // let the poll re-baseline after local change
      flashLcd('ORDER PLACED!', `-${item.points} PTS OK`)
      toast.success(`${item.name} ordered! Track it under My Orders.`)
    } catch (err) {
      flashLcd('ORDER FAILED', 'CHECK BALANCE')
      toast.error(err instanceof Error ? err.message : 'Could not place the order.')
    } finally {
      inFlightRef.current = false
    }
  }

  const [removingId, setRemovingId] = useState<string | null>(null)

  /**
   * Remove one of the student's orders. Status-specific semantics:
   *  - PENDING   → full refund, points return to the balance instantly
   *  - RECEIVED  → history cleanup only (item already claimed)
   *  - CANCELLED → history cleanup only (points were refunded on cancellation)
   * READY orders are not removable by students (server enforces this too).
   */
  const removeOrder = async (order: StudentOrder) => {
    if (removingId) return
    if (!isRemovableStatus(order.status)) return
    setRemovingId(order.id)
    inFlightRef.current = true
    try {
      const data = await authRequest<{ ok: boolean; refunded: number; user: AuthUser }>(
        '/api/student/orders',
        { orderId: order.id },
        'DELETE'
      )
      setOrders((prev) => (prev ?? []).filter((o) => o.id !== order.id))
      if (data.refunded > 0) {
        setPoints((p) => p + data.refunded)
        // The item goes back on the shop shelf.
        const item = SHOP_ITEMS.find((i) => i.name === order.itemName)
        if (item) setStock((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))
        flashLcd('ORDER REMOVED', `+${data.refunded} PTS BACK`)
        toast.success(
          `${order.itemName} removed — ${data.refunded} points refunded to your balance!`
        )
      } else {
        flashLcd('ORDER REMOVED', 'HISTORY UPDATED')
        toast.success(`${order.itemName} removed from your order history.`)
      }
    } catch (err) {
      flashLcd('REMOVE FAILED', 'TRY AGAIN')
      toast.error(err instanceof Error ? err.message : 'Could not remove the order.')
    } finally {
      setRemovingId(null)
      inFlightRef.current = false
    }
  }

  // Live LCD mirror lines (mirroring what the ESP32 writes over I2C)
  const lcd1 = flash ?? { l1: `POINTS: ${points}`, l2: 'SCAN RFID CARD' }
  const lcd2 = flash ?? { l1: 'RECYCLE BOTTLE', l2: `GOAL: ${bottles}/${goal} BTL` }

  const goalPct = Math.min(100, Math.round((bottles / goal) * 100))
  const nextReward = SHOP_ITEMS.filter((i) => i.points > points).sort(
    (a, b) => a.points - b.points
  )[0]

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Sign out of MathDuino"
            title="Sign out"
            className="text-slate-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="size-4" aria-hidden />
          </Button>

          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
              <Recycle className="size-5" aria-hidden />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-[0.25em] text-emerald-300 md-text-glow">
                MATHDUINO
              </h1>
              <p className="text-[10px] font-semibold tracking-[0.3em] text-slate-400">
                STUDENT PORTAL
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOrdersOpen(true)}
              aria-label={`My orders — ${activeOrders} active`}
              title="My orders"
              className="relative text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Package className="size-4" aria-hidden />
              {activeOrders > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full border border-emerald-400/60 bg-emerald-500 font-mono text-[9px] font-black text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                >
                  {activeOrders}
                </span>
              )}
            </Button>

            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.25)]"
              aria-live="polite"
            >
              <Coins className="size-3.5" aria-hidden />
              {points}
              <span className="hidden sm:inline">PTS</span>
            </span>

            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 py-1 pl-1 pr-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-lime-500 text-[11px] font-black text-slate-950">
                {initialsOf(user.name)}
              </span>
              <span className="hidden leading-tight min-[420px]:block">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  {user.emailVerified && (
                    <span
                      title="Verified account"
                      aria-label="Verified account"
                      className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 font-mono text-[8px] font-bold tracking-widest text-emerald-300"
                    >
                      <ShieldCheck className="size-2.5" aria-hidden />
                      VERIFIED
                    </span>
                  )}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {user.grade ?? 'Student'} · {user.section ?? 'Eco-Tech Club'} ·{' '}
                  <span className="font-mono text-emerald-400/90">{user.rfid ?? 'RFID PENDING'}</span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* LCD mirror + impact */}
        <section className="space-y-4" aria-labelledby="lcd-section">
          <SectionHeading>HARDWARE LCD MIRROR</SectionHeading>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur sm:p-5 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <LcdScreen title="LCD 1 · BALANCE" line1={lcd1.l1} line2={lcd1.l2} />
                <LcdScreen title="LCD 2 · STATION" line1={lcd2.l1} line2={lcd2.l2} />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-slate-500">
                  Live replica of the two 16x2 character LCDs on{' '}
                  <span className="font-mono text-slate-400">MD-01</span>. Deposits and bonuses
                  update both screens instantly.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={depositBottle}
                  className="shrink-0 border-emerald-500/50 bg-transparent font-bold tracking-wider text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                >
                  <Zap className="size-3.5" aria-hidden />
                  SIMULATE BOTTLE DEPOSIT
                </Button>
              </div>
            </div>

            {/* Impact card */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur sm:p-5">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
                <Trophy className="size-4 text-emerald-400" aria-hidden />
                MY RECYCLING IMPACT
              </p>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-mono text-5xl font-black leading-none text-emerald-300 md-text-glow">
                  {bottles}
                </span>
                <span className="pb-1 font-mono text-sm text-slate-500">/ {goal} BOTTLES</span>
              </div>
              <div
                className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label="Recycling goal progress"
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-valuenow={bottles}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all duration-700"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{goalPct}% of weekly goal</p>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500">
                  NEXT REWARD
                </p>
                {nextReward ? (
                  <p className="mt-1 text-xs text-slate-300">
                    <span className="font-semibold text-slate-100">{nextReward.name}</span> ·{' '}
                    <span className="font-mono text-emerald-300">{nextReward.points} PTS</span>
                    <span className="block text-slate-500">
                      {nextReward.points - points} more points to go
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-emerald-300">
                    You can afford every item in the shop!
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: Recycle, label: 'THIS WEEK', value: `${bottles}` },
                  { icon: Trophy, label: 'RANK', value: '#4' },
                  { icon: Flame, label: 'STREAK', value: '5 D' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <s.icon className="mx-auto size-3.5 text-emerald-400" aria-hidden />
                    <p className="mt-1 font-mono text-sm font-bold text-slate-200">{s.value}</p>
                    <p className="text-[9px] tracking-[0.2em] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quiz */}
        <section className="space-y-4" aria-labelledby="quiz-section">
          <SectionHeading>ONLINE QUIZ PRACTICE</SectionHeading>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur sm:p-6">
            <QuizPanel onFinish={handleQuizFinish} />
          </div>
        </section>

        {/* Reward shop */}
        <section className="space-y-4" aria-labelledby="shop-section">
          <SectionHeading>POINTS REWARD SHOP</SectionHeading>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur sm:p-6">
            <RewardShop points={points} stock={stock} onRedeem={redeem} />
          </div>
        </section>

        {/* Footer note */}
        <p className="flex items-center justify-center gap-2 pb-2 text-[11px] text-slate-600">
          <Monitor className="size-3.5" aria-hidden />
          This portal mirrors firmware events from MD-01 · Library Corridor · online
        </p>
      </div>

      {/* My Orders tracker */}
      <StudentOrdersDialog
        open={ordersOpen}
        onOpenChange={setOrdersOpen}
        orders={orders}
        loading={ordersLoading}
        removingId={removingId}
        onRemove={removeOrder}
        onRefresh={fetchOrders}
      />
    </div>
  )
}
