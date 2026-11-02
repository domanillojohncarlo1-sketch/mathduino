'use client'

// ============================================================
// MathDuino — Authentication gate
// Two SEPARATED portal experiences with pre-provisioned accounts
// (no self-serve signup — accounts are created ahead of the demo):
//   · STUDENT — sign in only
//   · ADMIN   — sign in only
// ============================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LogIn,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Sigma,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  DEMO_ACCOUNTS,
  authRequest,
  firstNameOf,
  type AuthUser,
  type UserRole,
} from '@/lib/auth-types'

/* ============================================================
 * AuthGate
 * ============================================================ */

interface AuthGateProps {
  onAuthed: (user: AuthUser) => void
}

export default function AuthGate({ onAuthed }: AuthGateProps) {
  const [role, setRole] = useState<UserRole>('STUDENT')

  /* ---- Sign in (shared by both portals) ---- */
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siShowPw, setSiShowPw] = useState(false)
  const [siBusy, setSiBusy] = useState(false)
  const [siError, setSiError] = useState<string | null>(null)

  const doSignIn = async (email: string, password: string) => {
    if (siBusy) return
    if (!email.trim() || !password) {
      setSiError('Enter your email and password to continue.')
      return
    }
    setSiBusy(true)
    setSiError(null)
    try {
      const { user } = await authRequest<{ user: AuthUser }>('/api/auth/login', { email, password })
      toast.success(
        user.role === 'ADMIN'
          ? `Welcome back, ${firstNameOf(user.name)} — admin console ready.`
          : `Welcome back, ${firstNameOf(user.name)}!`
      )
      onAuthed(user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.'
      setSiError(msg)
      toast.error(msg)
    } finally {
      setSiBusy(false)
    }
  }

  const switchRole = (r: UserRole) => {
    setRole(r)
    setSiError(null)
  }

  /* ================= Render ================= */

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------- Brand panel (desktop) ---------------- */}
      <aside
        className="relative hidden flex-col justify-center overflow-hidden px-10 py-14 lg:flex xl:px-16"
        aria-label="About MathDuino"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-lg"
        >
          <div className="relative w-fit">
            <div className="grid size-16 place-items-center rounded-2xl border border-emerald-500/40 bg-slate-900/80 text-emerald-300 shadow-[0_0_36px_rgba(16,185,129,0.35)]">
              <Recycle className="size-8" aria-hidden />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-lg border border-emerald-500/50 bg-slate-950 text-emerald-300">
              <Sigma className="size-4" aria-hidden />
            </div>
          </div>

          <h2 className="mt-6 text-4xl font-black tracking-[0.3em] text-emerald-300 md-text-glow">
            MATHDUINO
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            ESP32-powered recycling &amp; math quiz station — drop a bottle, answer the challenge,
            earn points for school supplies. Student and admin portals have separate accounts.
          </p>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Hardware stack">
            {['ESP32-S3', '16x2 I2C LCD', 'RFID RC522', 'HC-SR04', 'MQTT'].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-slate-400"
              >
                {chip}
              </span>
            ))}
          </div>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: GraduationCap, label: 'Student portal — recycle bottles, practice quizzes, shop rewards' },
              { icon: ShieldCheck, label: 'Admin portal — monitor the station, fulfil reward orders' },
              { icon: ShoppingBag, label: 'Points come from the machine — the online quiz is practice-only' },
            ].map((f) => (
              <li key={f.label} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <f.icon className="size-4" aria-hidden />
                </span>
                {f.label}
              </li>
            ))}
          </ul>

          {/* LCD boot terminal */}
          <div className="mt-10 max-w-sm rounded-xl border border-emerald-500/25 bg-[#04120c] p-4 font-mono text-[11px] leading-6 text-emerald-400/90 shadow-[inset_0_0_24px_rgba(16,185,129,0.08)]">
            <p className="text-emerald-600">&gt; MATHDUINO AUTH MODULE v2.4.1</p>
            <p>&gt; SCRYPT PASSWORD VAULT ... OK</p>
            <p>&gt; PORTALS: STUDENT / ADMIN · SEPARATE FLOWS</p>
            <p>
              &gt; AWAITING IDENTITY
              <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-emerald-400 align-middle" aria-hidden />
            </p>
          </div>
        </motion.div>
      </aside>

      {/* ---------------- Auth card ---------------- */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_0_48px_rgba(16,185,129,0.08)] backdrop-blur sm:p-8">
            {/* Card header */}
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.3)] lg:hidden">
                <Recycle className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.35em] text-slate-500">
                  MATHDUINO PORTAL
                </p>
                <h1 className="mt-0.5 text-lg font-bold text-slate-100">
                  Sign in as {role === 'ADMIN' ? 'administrator' : 'student'}
                </h1>
              </div>
            </div>

            {/* ---- Role switch: separated student / admin flows ---- */}
            <div className="mt-6 grid grid-cols-2 gap-2" role="group" aria-label="Choose portal">
              {(
                [
                  {
                    r: 'STUDENT' as UserRole,
                    icon: GraduationCap,
                    title: 'STUDENT',
                    desc: 'Recycle · quiz · rewards',
                  },
                  {
                    r: 'ADMIN' as UserRole,
                    icon: ShieldCheck,
                    title: 'ADMIN',
                    desc: 'Monitor · manage stations',
                  },
                ]
              ).map((opt) => (
                <button
                  key={opt.r}
                  type="button"
                  aria-pressed={role === opt.r}
                  onClick={() => switchRole(opt.r)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    role === opt.r
                      ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                      : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
                  )}
                >
                  <opt.icon
                    className={cn('size-5', role === opt.r ? 'text-emerald-300' : 'text-slate-500')}
                    aria-hidden
                  />
                  <p
                    className={cn(
                      'mt-1.5 font-mono text-[11px] font-bold tracking-[0.2em]',
                      role === opt.r ? 'text-emerald-200' : 'text-slate-300'
                    )}
                  >
                    {opt.title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* --------------- SIGN IN --------------- */}
            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                doSignIn(siEmail, siPassword)
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="si-email" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                  EMAIL ADDRESS
                </Label>
                <Input
                  id="si-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={siEmail}
                  onChange={(e) => setSiEmail(e.target.value)}
                  className="h-11 border-slate-700 bg-slate-950/60 focus-visible:ring-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="si-password" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                  PASSWORD
                </Label>
                <div className="relative">
                  <Input
                    id="si-password"
                    type={siShowPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    className="h-11 border-slate-700 bg-slate-950/60 pr-11 focus-visible:ring-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setSiShowPw((v) => !v)}
                    aria-label={siShowPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-emerald-300"
                  >
                    {siShowPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </div>

              {siError && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {siError}
                </p>
              )}

              <Button
                type="submit"
                disabled={siBusy}
                className="h-11 w-full bg-emerald-500 font-bold tracking-wider text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
              >
                {siBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <LogIn className="size-4" aria-hidden />
                )}
                {role === 'ADMIN' ? 'SIGN IN TO ADMIN' : 'SIGN IN TO STUDENT'}
              </Button>

              {/* Demo quick-fill — the pre-provisioned accounts */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={siBusy}
                  onClick={() => {
                    switchRole('STUDENT')
                    setSiEmail(DEMO_ACCOUNTS.student.email)
                    setSiPassword(DEMO_ACCOUNTS.student.password)
                    doSignIn(DEMO_ACCOUNTS.student.email, DEMO_ACCOUNTS.student.password)
                  }}
                  className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  <GraduationCap className="mr-1 inline size-3 text-emerald-400" aria-hidden />
                  TRY STUDENT DEMO
                </button>
                <button
                  type="button"
                  disabled={siBusy}
                  onClick={() => {
                    switchRole('ADMIN')
                    setSiEmail(DEMO_ACCOUNTS.admin.email)
                    setSiPassword(DEMO_ACCOUNTS.admin.password)
                    doSignIn(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.password)
                  }}
                  className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  <ShieldCheck className="mr-1 inline size-3 text-emerald-400" aria-hidden />
                  TRY ADMIN DEMO
                </button>
              </div>

              <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-slate-500">
                <ShoppingBag className="size-3" aria-hidden />
                Accounts are pre-provisioned for the demo — no self-signup.
              </p>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
