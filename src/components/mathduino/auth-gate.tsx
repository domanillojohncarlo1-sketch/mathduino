'use client'

// ============================================================
// MathDuino — Authentication gate
// Two SEPARATED portal experiences:
//   · STUDENT — sign in · create account (name + CARD ID + email + password)
//   · ADMIN   — sign in · create account (requires the admin access key)
// "Forgot password?" issues a 6-digit demo reset code (no email provider —
// the code is surfaced in the dialog instead of being emailed).
// ============================================================

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertCircle,
  CreditCard,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
  MailQuestion,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Sigma,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  ADMIN_ACCESS_CODE,
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Card IDs look like the demo RFID tags: RF-8823-1145 (lenient on length). */
const CARD_ID_RE = /^[A-Z0-9-]{4,24}$/

export default function AuthGate({ onAuthed }: AuthGateProps) {
  const [role, setRole] = useState<UserRole>('STUDENT')
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

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

  /* ---- Create account (separated per role) ---- */
  const [suName, setSuName] = useState('')
  const [suCardId, setSuCardId] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suShowPw, setSuShowPw] = useState(false)
  const [suAdminCode, setSuAdminCode] = useState('')
  const [suBusy, setSuBusy] = useState(false)
  const [suError, setSuError] = useState<string | null>(null)

  const doSignUp = async () => {
    if (suBusy) return
    const name = suName.trim()
    const email = suEmail.trim().toLowerCase()
    const cardId = suCardId.trim().toUpperCase().replace(/\s+/g, '')
    if (name.length < 2) return setSuError('Please enter your full name.')
    if (!EMAIL_RE.test(email)) return setSuError('Please enter a valid email address.')
    if (suPassword.length < 6) return setSuError('Password must be at least 6 characters.')
    if (role === 'STUDENT') {
      if (!cardId) return setSuError('Enter the CARD ID printed on your RFID card.')
      if (!CARD_ID_RE.test(cardId)) {
        return setSuError('That Card ID looks invalid — e.g. RF-8823-1145.')
      }
    }
    if (role === 'ADMIN' && suAdminCode.trim() !== ADMIN_ACCESS_CODE) {
      return setSuError('Invalid admin access key — admins must verify with the club key.')
    }
    setSuBusy(true)
    setSuError(null)
    try {
      const { user } = await authRequest<{ user: AuthUser }>('/api/auth/signup', {
        name,
        email,
        password: suPassword,
        role,
        cardId: role === 'STUDENT' ? cardId : undefined,
        adminCode: role === 'ADMIN' ? suAdminCode : undefined,
      })
      toast.success(
        role === 'ADMIN'
          ? `Admin account created — welcome, ${firstNameOf(user.name)}!`
          : `Student account created — card ${user.rfid ?? cardId} registered. Welcome, ${firstNameOf(user.name)}!`
      )
      onAuthed(user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account creation failed.'
      setSuError(msg)
      toast.error(msg)
    } finally {
      setSuBusy(false)
    }
  }

  /* ---- Forgot password (2-step demo reset, no email provider) ---- */
  const [fgOpen, setFgOpen] = useState(false)
  const [fgStep, setFgStep] = useState<'email' | 'code'>('email')
  const [fgEmail, setFgEmail] = useState('')
  const [fgCode, setFgCode] = useState('')
  const [fgPassword, setFgPassword] = useState('')
  const [fgShowPw, setFgShowPw] = useState(false)
  const [fgDemoCode, setFgDemoCode] = useState('')
  const [fgExpiresMin, setFgExpiresMin] = useState(15)
  const [fgBusy, setFgBusy] = useState(false)
  const [fgError, setFgError] = useState<string | null>(null)

  const openForgot = () => {
    setFgStep('email')
    setFgEmail(role === 'STUDENT' && siEmail ? siEmail : '')
    setFgCode('')
    setFgPassword('')
    setFgDemoCode('')
    setFgError(null)
    setFgOpen(true)
  }

  const sendResetCode = async () => {
    if (fgBusy) return
    if (!EMAIL_RE.test(fgEmail.trim().toLowerCase())) {
      return setFgError('Please enter a valid email address.')
    }
    setFgBusy(true)
    setFgError(null)
    try {
      const data = await authRequest<{
        sent: boolean
        demoCode: string
        expiresInMin: number
      }>('/api/auth/forgot-password', { email: fgEmail })
      setFgDemoCode(data.demoCode)
      setFgExpiresMin(data.expiresInMin)
      setFgStep('code')
    } catch (err) {
      setFgError(err instanceof Error ? err.message : 'Could not send a reset code.')
    } finally {
      setFgBusy(false)
    }
  }

  const doResetPassword = async () => {
    if (fgBusy) return
    if (!fgCode.trim()) return setFgError('Enter the 6-digit reset code.')
    if (fgPassword.length < 6) return setFgError('Password must be at least 6 characters.')
    setFgBusy(true)
    setFgError(null)
    try {
      await authRequest('/api/auth/reset-password', {
        email: fgEmail,
        code: fgCode,
        password: fgPassword,
      })
      toast.success('Password updated — sign in with your new password.')
      setFgOpen(false)
      setTab('signin')
      setSiEmail(fgEmail)
      setSiPassword('')
    } catch (err) {
      setFgError(err instanceof Error ? err.message : 'Could not reset the password.')
    } finally {
      setFgBusy(false)
    }
  }

  const switchRole = (r: UserRole) => {
    setRole(r)
    setSiError(null)
    setSuError(null)
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
              { icon: ShieldCheck, label: 'Admin portal — separate accounts, verified by access key' },
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
                  {tab === 'signin'
                    ? `Sign in as ${role === 'ADMIN' ? 'administrator' : 'student'}`
                    : `Create a ${role === 'ADMIN' ? 'new admin' : 'new student'} account`}
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

            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as 'signin' | 'signup')
                setSiError(null)
                setSuError(null)
              }}
            >
              <TabsList className="mt-5 grid h-11 w-full grid-cols-2 bg-slate-950/70">
                <TabsTrigger
                  value="signin"
                  className="font-mono text-[11px] font-bold tracking-[0.2em] data-[state=active]:text-emerald-300"
                >
                  SIGN IN
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="font-mono text-[11px] font-bold tracking-[0.2em] data-[state=active]:text-emerald-300"
                >
                  <UserPlus className="mr-1 inline size-3" aria-hidden />
                  CREATE ACCOUNT
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <AnimatePresence mode="wait" initial={false}>
              {/* --------------- SIGN IN --------------- */}
              {tab === 'signin' && (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
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

                  {/* Forgot password — beneath the demo quick-fill */}
                  <button
                    type="button"
                    onClick={openForgot}
                    className="mx-auto flex items-center gap-1.5 text-[11px] font-medium text-slate-500 underline-offset-2 transition-colors hover:text-emerald-300 hover:underline"
                  >
                    <MailQuestion className="size-3.5" aria-hidden />
                    Forgot password?
                  </button>
                </motion.form>
              )}

              {/* --------------- CREATE ACCOUNT --------------- */}
              {tab === 'signup' && (
                <motion.form
                  key={`signup-${role}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="mt-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    doSignUp()
                  }}
                >
                  {role === 'STUDENT' ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
                      <GraduationCap className="mr-1 inline size-3.5 text-emerald-400" aria-hidden />
                      Student account — recycle bottles at the machine, practice quizzes, spend
                      points in the reward shop. Starts at{' '}
                      <span className="font-semibold text-emerald-300">0 bottles · 0 points</span>.
                    </p>
                  ) : (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
                      <ShieldCheck className="mr-1 inline size-3.5 text-amber-400" aria-hidden />
                      Administrator account — monitor the station, fulfil reward orders. Requires
                      the admin access key below.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="su-name" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                      FULL NAME
                    </Label>
                    <Input
                      id="su-name"
                      autoComplete="name"
                      placeholder="Juan Dela Cruz"
                      value={suName}
                      onChange={(e) => setSuName(e.target.value)}
                      className="h-11 border-slate-700 bg-slate-950/60 focus-visible:ring-emerald-500/50"
                    />
                  </div>

                  {role === 'STUDENT' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="su-card-id" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                        CARD ID
                      </Label>
                      <div className="relative">
                        <CreditCard
                          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                          aria-hidden
                        />
                        <Input
                          id="su-card-id"
                          placeholder="RF-0000-0000"
                          autoComplete="off"
                          value={suCardId}
                          onChange={(e) => setSuCardId(e.target.value.toUpperCase())}
                          className="h-11 border-slate-700 bg-slate-950/60 pl-9 font-mono uppercase focus-visible:ring-emerald-500/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        The ID printed on your RFID card — scanning it at the station identifies
                        you, e.g. <span className="font-mono text-emerald-400/90">RF-8823-1145</span>.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="su-email" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                      EMAIL ADDRESS
                    </Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      className="h-11 border-slate-700 bg-slate-950/60 focus-visible:ring-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="su-password" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                      PASSWORD
                    </Label>
                    <div className="relative">
                      <Input
                        id="su-password"
                        type={suShowPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={suPassword}
                        onChange={(e) => setSuPassword(e.target.value)}
                        className="h-11 border-slate-700 bg-slate-950/60 pr-11 focus-visible:ring-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setSuShowPw((v) => !v)}
                        aria-label={suShowPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-emerald-300"
                      >
                        {suShowPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      </button>
                    </div>
                  </div>

                  {role === 'ADMIN' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label htmlFor="su-admin-code" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                        ADMIN ACCESS KEY
                      </Label>
                      <div className="relative">
                        <KeyRound
                          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                          aria-hidden
                        />
                        <Input
                          id="su-admin-code"
                          placeholder="MD-••••-••••"
                          autoComplete="off"
                          value={suAdminCode}
                          onChange={(e) => setSuAdminCode(e.target.value)}
                          className="h-11 border-slate-700 bg-slate-950/60 pl-9 font-mono focus-visible:ring-emerald-500/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Demo key:{' '}
                        <span className="font-mono text-emerald-400/90">{ADMIN_ACCESS_CODE}</span>
                      </p>
                    </motion.div>
                  )}

                  {suError && (
                    <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
                      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                      {suError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={suBusy}
                    className={cn(
                      'h-11 w-full font-bold tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.35)]',
                      role === 'ADMIN'
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400'
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    )}
                  >
                    {suBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <UserPlus className="size-4" aria-hidden />
                    )}
                    {role === 'ADMIN' ? 'CREATE ADMIN ACCOUNT' : 'CREATE STUDENT ACCOUNT'}
                  </Button>

                  <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-slate-500">
                    <Users className="size-3" aria-hidden />
                    Student and admin accounts are separate — pick the portal that matches you.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ---------------- Forgot password dialog ---------------- */}
      <Dialog
        open={fgOpen}
        onOpenChange={(open) => {
          setFgOpen(open)
          if (!open) setFgError(null)
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-[0.15em] text-emerald-300">
              <MailQuestion className="size-4" aria-hidden />
              RESET YOUR PASSWORD
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {fgStep === 'email'
                ? 'Enter your account email — we will issue a 6-digit reset code.'
                : 'Enter the reset code and choose a new password.'}
            </DialogDescription>
          </DialogHeader>

          {fgStep === 'email' ? (
            <form
              className="mt-1 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                sendResetCode()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="fg-email" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                  EMAIL ADDRESS
                </Label>
                <Input
                  id="fg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@mathduino.io"
                  value={fgEmail}
                  onChange={(e) => setFgEmail(e.target.value)}
                  className="h-11 border-slate-700 bg-slate-900/70 focus-visible:ring-emerald-500/50"
                />
              </div>

              {fgError && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {fgError}
                </p>
              )}

              <Button
                type="submit"
                disabled={fgBusy}
                className="h-11 w-full bg-emerald-500 font-bold tracking-wider text-slate-950 hover:bg-emerald-400"
              >
                {fgBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                SEND RESET CODE
              </Button>
            </form>
          ) : (
            <form
              className="mt-1 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                doResetPassword()
              }}
            >
              {/* Demo mode — the "email" is shown inline since there is no mail provider */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                <p className="text-[10px] font-bold tracking-[0.25em] text-amber-300">
                  DEMO MODE · EMAIL DELIVERY DISABLED
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-[0.35em] text-emerald-300 md-text-glow">
                  {fgDemoCode}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Expires in {fgExpiresMin} min — in production this is emailed to{' '}
                  <span className="font-mono">{fgEmail}</span>.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fg-code" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                  RESET CODE
                </Label>
                <Input
                  id="fg-code"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  value={fgCode}
                  onChange={(e) => setFgCode(e.target.value.replace(/\D/g, ''))}
                  className="h-11 border-slate-700 bg-slate-900/70 text-center font-mono text-lg tracking-[0.5em] focus-visible:ring-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fg-password" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                  NEW PASSWORD
                </Label>
                <div className="relative">
                  <Input
                    id="fg-password"
                    type={fgShowPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={fgPassword}
                    onChange={(e) => setFgPassword(e.target.value)}
                    className="h-11 border-slate-700 bg-slate-900/70 pr-11 focus-visible:ring-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setFgShowPw((v) => !v)}
                    aria-label={fgShowPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-emerald-300"
                  >
                    {fgShowPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </div>

              {fgError && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {fgError}
                </p>
              )}

              <Button
                type="submit"
                disabled={fgBusy}
                className="h-11 w-full bg-emerald-500 font-bold tracking-wider text-slate-950 hover:bg-emerald-400"
              >
                {fgBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                UPDATE PASSWORD
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
