'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import {
  Award,
  BarChart3,
  BookOpen,
  Coins,
  Medal,
  Recycle,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { STUDENTS_INITIAL, WEEKLY_BOTTLES } from '@/lib/mathduino'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  delta: string
  deltaUp: boolean
}

function StatCard({ icon: Icon, label, value, delta, deltaUp }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <Badge
          variant="outline"
          className={
            deltaUp
              ? 'border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 font-mono text-[10px] text-amber-300'
          }
        >
          <TrendingUp className={deltaUp ? 'size-3' : 'size-3 rotate-180'} aria-hidden />
          {delta}
        </Badge>
      </div>
      <p className="mt-3 font-mono text-2xl font-black text-slate-100">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold tracking-[0.2em] text-slate-500">{label}</p>
    </div>
  )
}

export default function ReportsView() {
  const maxWeekly = Math.max(...WEEKLY_BOTTLES.map((w) => w.value))
  const leaders = [...STUDENTS_INITIAL].sort((a, b) => b.bottles - a.bottles).slice(0, 5)
  const rankIcons = [Trophy, Medal, Award]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <section aria-label="Summary statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Recycle} label="TOTAL BOTTLES" value="1,248" delta="+12%" deltaUp />
        <StatCard icon={Coins} label="POINTS ISSUED" value="8,930" delta="+8%" deltaUp />
        <StatCard icon={Users} label="ACTIVE STUDENTS" value="142" delta="+3" deltaUp />
        <StatCard icon={BookOpen} label="QUIZZES TAKEN" value="356" delta="-4%" deltaUp={false} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly chart */}
        <section
          aria-label="Bottles collected this week"
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
              <BarChart3 className="size-4 text-emerald-400" aria-hidden />
              BOTTLES COLLECTED — THIS WEEK
            </h3>
            <span className="font-mono text-[10px] text-slate-500">1,273 TOTAL · AVG 181/DAY</span>
          </div>

          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-4" role="img" aria-label="Weekly bottles bar chart">
            {WEEKLY_BOTTLES.map((w, i) => (
              <div key={w.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="font-mono text-[10px] text-slate-400">{w.value}</span>
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
                  className="w-full origin-bottom rounded-t-md bg-gradient-to-t from-emerald-700 via-emerald-500 to-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)] transition-colors hover:from-emerald-600 hover:to-emerald-200"
                  style={{ height: `${(w.value / maxWeekly) * 100}%` }}
                  title={`${w.day}: ${w.value} bottles`}
                />
                <span className="text-[10px] font-semibold tracking-widest text-slate-500">{w.day}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Leaderboard + quiz stats */}
        <div className="space-y-4">
          <section aria-label="Top recyclers" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
              <Trophy className="size-4 text-emerald-400" aria-hidden />
              TOP RECYCLERS
            </h3>
            <ol className="mt-4 space-y-2.5">
              {leaders.map((s, i) => {
                const RankIcon = rankIcons[i]
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <span
                      className={
                        RankIcon
                          ? 'grid size-7 place-items-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'grid size-7 place-items-center rounded-lg border border-slate-700 bg-slate-950 font-mono text-[11px] font-bold text-slate-400'
                      }
                    >
                      {RankIcon ? <RankIcon className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-200">{s.name}</span>
                      <span className="block text-[10px] text-slate-500">
                        {s.grade} · {s.section}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm font-bold text-emerald-300">{s.bottles}</span>
                      <span className="block text-[9px] tracking-[0.2em] text-slate-500">BOTTLES</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          <section aria-label="Quiz statistics" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
              <BookOpen className="size-4 text-emerald-400" aria-hidden />
              PRACTICE QUIZ STATS
            </h3>
            <div className="mt-4 space-y-4">
              {[
                { label: 'AVERAGE SCORE', value: 3.8, display: '3.8 / 5', pct: 76 },
                { label: 'COMPLETION RATE', value: 87, display: '87%', pct: 87 },
                { label: 'DAILY ACTIVE QUIZZERS', value: 64, display: '64 / 142', pct: 45 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[10px] tracking-[0.18em]">
                    <span className="font-semibold text-slate-500">{row.label}</span>
                    <span className="font-mono text-slate-300">{row.display}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300"
                    />
                  </div>
                </div>
              ))}
              <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 text-[11px] text-slate-400">
                Most missed topic: <span className="font-semibold text-amber-300">long division</span> —
                consider a classroom review.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
