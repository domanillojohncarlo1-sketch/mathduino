'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Recycle } from 'lucide-react'
import AuthGate from '@/components/mathduino/auth-gate'
import StudentPortal from '@/components/mathduino/student/portal'
import AdminPortal from '@/components/mathduino/admin/portal'
import {
  authRequest,
  clearSessionToken,
  type AuthUser,
} from '@/lib/auth-types'

/**
 * Session boot states:
 *   undefined → checking the httpOnly session cookie with the API
 *   null      → no session, show the auth gate
 *   AuthUser  → verified session, route to the role's portal
 */
export default function Home() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    authRequest<{ user: AuthUser | null }>('/api/auth/session')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
  }, [])

  const handleLogout = () => {
    // Fire-and-forget: clear the server session, drop straight to the gate.
    void authRequest('/api/auth/logout', {}).catch(() => undefined)
    clearSessionToken()
    setUser(null)
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-slate-950 text-slate-100">
      {/* Ambient background layers */}
      <div aria-hidden className="md-grid-bg pointer-events-none fixed inset-0" />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-48 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-600/[0.07] blur-3xl"
      />

      <main className="relative z-10 flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {user === undefined && (
            <motion.div
              key="boot"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col items-center justify-center gap-5 py-24"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="relative">
                <div className="grid size-16 place-items-center rounded-2xl border border-emerald-500/40 bg-slate-900/80 text-emerald-300 shadow-[0_0_36px_rgba(16,185,129,0.35)]">
                  <Recycle className="size-8 animate-pulse" aria-hidden />
                </div>
              </div>
              <p className="font-mono text-[11px] tracking-[0.35em] text-slate-500">
                VERIFYING SESSION
                <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-emerald-400 align-middle" aria-hidden />
              </p>
            </motion.div>
          )}

          {user === null && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-1 flex-col"
            >
              <AuthGate onAuthed={setUser} />
            </motion.div>
          )}

          {user?.role === 'STUDENT' && (
            <motion.div
              key={`student-${user.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-1 flex-col"
            >
              <StudentPortal user={user} onLogout={handleLogout} />
            </motion.div>
          )}

          {user?.role === 'ADMIN' && (
            <motion.div
              key={`admin-${user.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-1 flex-col"
            >
              <AdminPortal user={user} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky footer — pinned to viewport bottom on short pages, pushed down naturally otherwise */}
      <footer className="relative z-10 mt-auto border-t border-slate-800/70 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[11px] text-slate-500 sm:flex-row sm:px-6">
          <p className="flex items-center gap-2">
            <Recycle className="size-3.5 text-emerald-400" aria-hidden />
            <span className="font-semibold tracking-[0.25em] text-slate-300">MATHDUINO</span>
            <span className="hidden sm:inline">· ESP32 Recycling &amp; Math Quiz Station</span>
          </p>
          <p>Eco-Tech Club © 2025 · Web mirror v1.1 · Role-verified access</p>
        </div>
      </footer>
    </div>
  )
}
