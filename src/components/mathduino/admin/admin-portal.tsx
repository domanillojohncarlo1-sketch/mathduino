'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Activity,
  BarChart3,
  Cpu,
  LogOut,
  Package,
  ShieldCheck,
  Users,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { initialsOf, type AuthUser } from '@/lib/auth-types'
import LiveView from '@/components/mathduino/admin/live-view'
import ReportsView from '@/components/mathduino/admin/reports-view'
import UsersView from '@/components/mathduino/admin/users-view'
import OrdersView from '@/components/mathduino/admin/orders-view'
import HardwareConfigView from '@/components/mathduino/admin/hardware-config-view'

const NAV: Array<{ id: TabId; label: string; short: string; icon: LucideIcon }> = [
  { id: 'live', label: 'Live View', short: 'LIVE', icon: Activity },
  { id: 'reports', label: 'Reports', short: 'REPORTS', icon: BarChart3 },
  { id: 'users', label: 'User Management', short: 'USERS', icon: Users },
  { id: 'orders', label: 'Order Management', short: 'ORDERS', icon: Package },
  { id: 'hardware', label: 'Hardware Config', short: 'HARDWARE', icon: Cpu },
]

type TabId = 'live' | 'reports' | 'users' | 'orders' | 'hardware'

interface AdminPortalProps {
  /** Verified session user (role ADMIN). */
  user: AuthUser
  /** End the session and return to the auth gate. */
  onLogout: () => void
}

export default function AdminPortal({ user, onLogout }: AdminPortalProps) {
  const [tab, setTab] = useState<TabId>('live')

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[100rem] items-center gap-3 px-4 py-3 sm:px-6">
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
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-[0.25em] text-emerald-300 md-text-glow">
                MATHDUINO
              </h1>
              <p className="text-[10px] font-semibold tracking-[0.3em] text-slate-400">
                ADMIN PANEL
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-emerald-300 md:inline-flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              ESP32 LINK · MQTT OK
            </span>

            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 py-1 pl-1 pr-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[11px] font-black text-slate-950">
                {initialsOf(user.name)}
              </span>
              <span className="hidden leading-tight min-[480px]:block">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  {user.emailVerified && (
                    <span
                      title="Verified administrator"
                      aria-label="Verified administrator"
                      className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 font-mono text-[8px] font-bold tracking-widest text-emerald-300"
                    >
                      <ShieldCheck className="size-2.5" aria-hidden />
                      VERIFIED
                    </span>
                  )}
                </span>
                <span className="block text-[10px] text-slate-500">System Administrator</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav
          className="md-scroll flex gap-1.5 overflow-x-auto border-t border-slate-800/70 px-4 py-2 lg:hidden"
          aria-label="Admin sections"
        >
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.15em] transition-colors',
                tab === item.id
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <item.icon className="size-3.5" aria-hidden />
              {item.short}
            </button>
          ))}
        </nav>
      </header>

      {/* ---------- Body ---------- */}
      <div className="mx-auto flex w-full max-w-[100rem] flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800/70 px-3 py-6 lg:flex">
          <nav className="space-y-1" aria-label="Admin sections">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  tab === item.id
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.15)]'
                    : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
                {tab === item.id && (
                  <span className="ml-auto size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" aria-hidden />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] leading-relaxed text-slate-500">
            <p className="flex items-center gap-1.5 font-mono font-semibold text-emerald-400">
              <Wifi className="size-3" aria-hidden />
              MQTT · ONLINE
            </p>
            <p className="mt-1.5">
              Firmware <span className="font-mono text-slate-300">v2.4.1</span>
            </p>
            <p>
              Uptime <span className="font-mono text-slate-300">14d 06:22</span>
            </p>
            <p className="mt-1.5 text-[10px] text-slate-600">3 stations registered</p>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {tab === 'live' && <LiveView />}
              {tab === 'reports' && <ReportsView />}
              {tab === 'users' && <UsersView />}
              {tab === 'orders' && <OrdersView />}
              {tab === 'hardware' && <HardwareConfigView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
