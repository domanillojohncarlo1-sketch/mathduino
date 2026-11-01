'use client'

// ============================================================
// MathDuino — Authentication gate
// Sign in / Sign up with credentials + social sign-in
// (Google / GitHub / Facebook) via a simulated OAuth consent flow.
// ============================================================

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Sigma,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  ADMIN_ACCESS_CODE,
  DEMO_ACCOUNTS,
  PROVIDER_LABEL,
  SOCIAL_PERSONAS,
  authRequest,
  firstNameOf,
  initialsOf,
  type AuthUser,
  type SocialProvider,
  type UserRole,
} from '@/lib/auth-types'

/* ---------------- Brand icons (inline SVG) ---------------- */

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden focusable="false">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  )
}

const PROVIDER_ICONS: Record<SocialProvider, (p: { className?: string }) => React.ReactNode> = {
  google: GoogleIcon,
  github: GitHubIcon,
  facebook: FacebookIcon,
}

/* ---------------- Helpers ---------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Account shown on the OAuth chooser (seeded persona or custom entry). */
interface ChoosableAccount {
  email: string
  name: string
  role: UserRole
  handle?: string
  custom?: boolean
}

type OAuthStep = 'choose' | 'consent' | 'working'

/* ============================================================
 * AuthGate
 * ============================================================ */

interface AuthGateProps {
  onAuthed: (user: AuthUser) => void
}

export default function AuthGate({ onAuthed }: AuthGateProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

  /* ---- Social / OAuth dialog state ---- */
  const [socialOpen, setSocialOpen] = useState(false)
  const [provider, setProvider] = useState<SocialProvider>('google')
  const [step, setStep] = useState<OAuthStep>('choose')
  const [account, setAccount] = useState<ChoosableAccount | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customEmail, setCustomEmail] = useState('')
  const [customErr, setCustomErr] = useState<string | null>(null)
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null)
  /** Bumped whenever the dialog closes so in-flight social logins are discarded. */
  const socialSeq = useRef(0)

  const openSocial = (p: SocialProvider) => {
    setProvider(p)
    setStep('choose')
    setAccount(null)
    setCustomMode(false)
    setCustomName('')
    setCustomEmail('')
    setCustomErr(null)
    setBusyProvider(p)
    setSocialOpen(true)
  }

  const closeSocial = () => {
    socialSeq.current += 1 // invalidate in-flight social logins
    setSocialOpen(false)
    setBusyProvider(null)
  }

  const confirmConsent = async () => {
    if (!account) return
    setStep('working')
    const seq = socialSeq.current
    try {
      // Enforce a minimum “verifying identity” beat so the simulated
      // OAuth hand-off always feels deliberate, never a jarring flash.
      const [{ user }] = await Promise.all([
        authRequest<{ user: AuthUser }>('/api/auth/social', {
          provider,
          email: account.email,
          name: account.custom ? account.name : undefined,
          custom: account.custom,
        }),
        sleep(750),
      ])
      if (seq !== socialSeq.current) return // dialog was closed mid-flight
      closeSocial()
      toast.success(`Welcome, ${firstNameOf(user.name)}! Signed in via ${PROVIDER_LABEL[provider]}.`)
      onAuthed(user)
    } catch (err) {
      if (seq !== socialSeq.current) return
      setStep('choose')
      toast.error(err instanceof Error ? err.message : 'Social sign-in failed.')
    }
  }

  const choosePersona = (acc: ChoosableAccount) => {
    setAccount(acc)
    setStep('consent')
  }

  const submitCustom = () => {
    const name = customName.trim()
    const email = customEmail.trim().toLowerCase()
    if (name.length < 2) return setCustomErr('Please enter your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setCustomErr('Enter a valid email address.')
    setCustomErr(null)
    choosePersona({ email, name, role: 'STUDENT', custom: true })
  }

  /* ---- Sign in ---- */
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
      toast.success(`Welcome back, ${firstNameOf(user.name)}!`)
      onAuthed(user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.'
      setSiError(msg)
      toast.error(msg)
    } finally {
      setSiBusy(false)
    }
  }

  /* ---- Sign up ---- */
  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suShowPw, setSuShowPw] = useState(false)
  const [suRole, setSuRole] = useState<UserRole>('STUDENT')
  const [suAdminCode, setSuAdminCode] = useState('')
  const [suBusy, setSuBusy] = useState(false)
  const [suError, setSuError] = useState<string | null>(null)

  const doSignUp = async () => {
    if (suBusy) return
    const name = suName.trim()
    const email = suEmail.trim().toLowerCase()
    if (name.length < 2) return setSuError('Please enter your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setSuError('Enter a valid email address.')
    if (suPassword.length < 6) return setSuError('Password must be at least 6 characters.')
    if (suRole === 'ADMIN' && suAdminCode !== ADMIN_ACCESS_CODE) {
      return setSuError('Invalid admin access code — admins must verify with the club code.')
    }
    setSuBusy(true)
    setSuError(null)
    try {
      const { user } = await authRequest<{ user: AuthUser }>('/api/auth/signup', {
        name,
        email,
        password: suPassword,
        role: suRole,
        adminCode: suRole === 'ADMIN' ? suAdminCode : undefined,
      })
      toast.success(
        suRole === 'ADMIN'
          ? `Admin account verified — welcome, ${firstNameOf(user.name)}!`
          : `Account created & verified — welcome, ${firstNameOf(user.name)}!`
      )
      onAuthed(user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed.'
      setSuError(msg)
      toast.error(msg)
    } finally {
      setSuBusy(false)
    }
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
            earn points for school supplies. Verified accounts keep the leaderboard honest.
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
              { icon: ShieldCheck, label: 'Verified student & admin accounts with role-based access' },
              { icon: Users, label: 'Social sign-in — continue with Google, GitHub or Facebook' },
              { icon: ShoppingBag, label: 'Students earn & spend points · admins run every station' },
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
            <p>&gt; OAUTH PROVIDERS: GOOGLE / GITHUB / FB</p>
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
                  {tab === 'signin' ? 'Sign in to continue' : 'Create your account'}
                </h1>
              </div>
            </div>

            {/* Social sign-in */}
            <div className="mt-6">
              <p className="text-center font-mono text-[10px] tracking-[0.3em] text-slate-500">
                VERIFY &amp; CONTINUE WITH
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(['google', 'github', 'facebook'] as SocialProvider[]).map((p) => {
                  const Icon = PROVIDER_ICONS[p]
                  return (
                    <Button
                      key={p}
                      type="button"
                      variant="outline"
                      disabled={busyProvider !== null || siBusy || suBusy}
                      onClick={() => openSocial(p)}
                      className="h-11 border-slate-700 bg-slate-900/60 font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-200"
                    >
                      {busyProvider === p ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <>
                          <Icon className="size-4" />
                          <span className="hidden text-xs min-[380px]:inline">
                            {PROVIDER_LABEL[p]}
                          </span>
                        </>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="my-6 flex items-center gap-3" role="separator" aria-label="or">
              <Separator className="flex-1 bg-slate-800" />
              <span className="font-mono text-[10px] tracking-[0.25em] text-slate-600">OR EMAIL</span>
              <Separator className="flex-1 bg-slate-800" />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')}>
              <TabsList className="grid h-11 w-full grid-cols-2 bg-slate-950/70">
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
                  SIGN UP
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
                      ACCOUNT EMAIL
                    </Label>
                    <Input
                      id="si-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@school.edu"
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
                    disabled={siBusy || busyProvider !== null}
                    className="h-11 w-full bg-emerald-500 font-bold tracking-wider text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
                  >
                    {siBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <LogIn className="size-4" aria-hidden />
                    )}
                    SIGN IN
                  </Button>

                  {/* Demo quick-fill */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={siBusy}
                      onClick={() => {
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
                </motion.form>
              )}

              {/* --------------- SIGN UP --------------- */}
              {tab === 'signup' && (
                <motion.form
                  key="signup"
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
                  <div className="grid gap-4 sm:grid-cols-2">
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
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                        EMAIL
                      </Label>
                      <Input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@school.edu"
                        value={suEmail}
                        onChange={(e) => setSuEmail(e.target.value)}
                        className="h-11 border-slate-700 bg-slate-950/60 focus-visible:ring-emerald-500/50"
                      />
                    </div>
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

                  {/* Role verification selector */}
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                      REGISTER AS
                    </Label>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Account role">
                      {(
                        [
                          { role: 'STUDENT' as UserRole, icon: GraduationCap, title: 'STUDENT', desc: 'Earn points & shop rewards' },
                          { role: 'ADMIN' as UserRole, icon: ShieldCheck, title: 'ADMIN', desc: 'Monitor & control stations' },
                        ]
                      ).map((opt) => (
                        <button
                          key={opt.role}
                          type="button"
                          aria-pressed={suRole === opt.role}
                          onClick={() => setSuRole(opt.role)}
                          className={cn(
                            'rounded-xl border p-3 text-left transition-all',
                            suRole === opt.role
                              ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                              : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
                          )}
                        >
                          <opt.icon
                            className={cn(
                              'size-5',
                              suRole === opt.role ? 'text-emerald-300' : 'text-slate-500'
                            )}
                            aria-hidden
                          />
                          <p
                            className={cn(
                              'mt-1.5 font-mono text-[11px] font-bold tracking-[0.2em]',
                              suRole === opt.role ? 'text-emerald-200' : 'text-slate-300'
                            )}
                          >
                            {opt.title}
                          </p>
                          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {suRole === 'ADMIN' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label htmlFor="su-admin-code" className="font-mono text-[10px] tracking-[0.25em] text-slate-400">
                        ADMIN ACCESS CODE
                      </Label>
                      <div className="relative">
                        <KeyRound
                          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                          aria-hidden
                        />
                        <Input
                          id="su-admin-code"
                          placeholder="MD-••••-••••"
                          value={suAdminCode}
                          onChange={(e) => setSuAdminCode(e.target.value)}
                          className="h-11 border-slate-700 bg-slate-950/60 pl-9 font-mono focus-visible:ring-emerald-500/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Demo club code:{' '}
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
                    disabled={suBusy || busyProvider !== null}
                    className="h-11 w-full bg-emerald-500 font-bold tracking-wider text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
                  >
                    {suBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <UserPlus className="size-4" aria-hidden />
                    )}
                    CREATE VERIFIED ACCOUNT
                  </Button>

                  <p className="text-center text-[10px] leading-relaxed text-slate-500">
                    Demo environment — accounts are verified instantly. Students get 220 starting
                    points &amp; an RFID card ID.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-600">
            <ShieldCheck className="size-3.5 text-emerald-500/70" aria-hidden />
            Protected by role-based verification · Students &amp; admins only
          </p>
        </motion.div>
      </div>

      {/* ---------------- OAuth consent dialog ---------------- */}
      <Dialog open={socialOpen} onOpenChange={(open) => !open && closeSocial()}>
        <DialogContent className="max-w-sm border-slate-800 bg-slate-900 p-0 text-slate-100 sm:max-w-md">
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
            {(() => {
              const Icon = PROVIDER_ICONS[provider]
              return <Icon className="size-5" />
            })()}
            <div>
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-sm font-bold">
                  Sign in with {PROVIDER_LABEL[provider]}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  to continue to MathDuino
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Step 1 — choose an account */}
          {step === 'choose' && (
            <div className="px-5 py-4">
              <p className="font-mono text-[10px] tracking-[0.25em] text-slate-500">
                CHOOSE AN ACCOUNT
              </p>
              <ul className="mt-3 space-y-2">
                {SOCIAL_PERSONAS[provider].map((p) => (
                  <li key={p.email}>
                    <button
                      type="button"
                      onClick={() => choosePersona(p)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5"
                    >
                      <span
                        className={cn(
                          'grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-slate-950',
                          p.role === 'ADMIN'
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                            : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        )}
                      >
                        {initialsOf(p.name)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-100">
                            {p.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 px-1.5 py-0 font-mono text-[9px] tracking-widest',
                              p.role === 'ADMIN'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            )}
                          >
                            {p.role}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {p.handle ? `@${p.handle} · ` : ''}
                          {p.email}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}

                {/* Use another account */}
                <li>
                  {!customMode ? (
                    <button
                      type="button"
                      onClick={() => setCustomMode(true)}
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-700 p-3 text-left text-sm text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-900">
                        <UserPlus className="size-4" aria-hidden />
                      </span>
                      Use another account
                    </button>
                  ) : (
                    <div className="space-y-2.5 rounded-xl border border-emerald-500/40 bg-slate-950/60 p-3">
                      <Input
                        aria-label="Your full name"
                        placeholder="Full name"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="h-10 border-slate-700 bg-slate-900 focus-visible:ring-emerald-500/50"
                      />
                      <Input
                        aria-label="Your email address"
                        type="email"
                        placeholder="you@gmail.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="h-10 border-slate-700 bg-slate-900 focus-visible:ring-emerald-500/50"
                      />
                      {customErr && (
                        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
                          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                          {customErr}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCustomMode(false)
                            setCustomErr(null)
                          }}
                          className="h-9 text-slate-400 hover:text-slate-200"
                        >
                          <ChevronLeft className="size-4" aria-hidden />
                          Back
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={submitCustom}
                          className="h-9 flex-1 bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              </ul>
            </div>
          )}

          {/* Step 2 — consent */}
          {step === 'consent' && account && (
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-11 place-items-center rounded-full text-sm font-black text-slate-950',
                    account.role === 'ADMIN'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                  )}
                >
                  {initialsOf(account.name)}
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-slate-100">{account.name}</p>
                  <p className="text-xs text-slate-500">{account.email}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-slate-100">MathDuino</span> wants to access
                  your
                </p>
                <ul className="mt-3 space-y-2">
                  {['Name', 'Email address', 'Profile picture'].map((scope) => (
                    <li key={scope} className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle2 className="size-3.5 text-emerald-400" aria-hidden />
                      {scope}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                This simulates the real {PROVIDER_LABEL[provider]} OAuth consent screen — no data
                leaves your browser.
              </p>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('choose')}
                  className="h-10 flex-1 border-slate-700 text-slate-300 hover:bg-slate-800/60"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmConsent}
                  className="h-10 flex-1 bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Continue as {firstNameOf(account.name)}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — working */}
          {step === 'working' && (
            <div className="flex flex-col items-center px-5 py-10" aria-live="polite">
              <Loader2 className="size-7 animate-spin text-emerald-400" aria-hidden />
              <p className="mt-4 font-mono text-[11px] tracking-[0.25em] text-slate-400">
                VERIFYING IDENTITY...
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Establishing a secure session
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
