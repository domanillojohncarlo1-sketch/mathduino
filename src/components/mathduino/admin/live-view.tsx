'use client'

// ============================================================
// MathDuino — Admin · Live View
// Hardware status of the recycler (servo, buzzer, ultrasonic,
// RFID) + the streaming system log. No simulated system
// telemetry (CPU/RAM/temp) and no multi-station list — the
// demo runs a single physical machine (MD-01).
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Radar,
  RotateCw,
  ScanLine,
  ScrollText,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  clamp,
  initialLogs,
  makeLog,
  rand,
  randInt,
  type LogEntry,
  type LogType,
} from '@/lib/mathduino'

/* ================= Logs ================= */

const LOG_STYLES: Record<LogType, string> = {
  RFID: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  ERROR: 'text-red-300 border-red-500/40 bg-red-500/10',
  WARN: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  INFO: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  SERVO: 'text-teal-300 border-teal-500/40 bg-teal-500/10',
  QUIZ: 'text-lime-300 border-lime-500/40 bg-lime-500/10',
}

/* ================= Live view ================= */

export default function LiveView() {
  // --- ultrasonic distance ---
  const [distance, setDistance] = useState(23.2)
  useEffect(() => {
    const t = setInterval(() => setDistance((d) => clamp(d + rand(-4, 5), 6, 42)), 1600)
    return () => clearInterval(t)
  }, [])
  const bottleDetected = distance < 12

  // --- servo ---
  const [servo, setServo] = useState<{ status: 'IDLE' | 'ROTATING'; angle: number }>({
    status: 'IDLE',
    angle: 0,
  })
  const servoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const t = setInterval(() => {
      setServo({ status: 'ROTATING', angle: randInt(55, 165) })
      servoTimer.current = setTimeout(() => setServo({ status: 'IDLE', angle: 0 }), 1500)
    }, 6000)
    return () => {
      clearInterval(t)
      if (servoTimer.current) clearTimeout(servoTimer.current)
    }
  }, [])

  // --- buzzer ---
  const [buzzerOn, setBuzzerOn] = useState(true)

  // --- logs ---
  const [logs, setLogs] = useState<LogEntry[]>(() => initialLogs())
  const logBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setLogs((prev) => [...prev.slice(-59), makeLog()]), 3400)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = logBoxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div className="space-y-6">
      {/* ---- Hardware status ---- */}
      <section aria-label="Hardware status">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
              <Zap className="size-4 text-emerald-400" aria-hidden />
              HARDWARE STATUS — MD-01
            </h3>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-300">
              ALL GPIO OK
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Servo */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <RotateCw className={cn('size-3.5 text-emerald-400', servo.status === 'ROTATING' && 'animate-spin')} aria-hidden />
                  SERVO SG90
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-[10px]',
                    servo.status === 'ROTATING'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 text-slate-400'
                  )}
                >
                  {servo.status}
                </Badge>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${(servo.angle / 180) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-slate-500">
                ANGLE: {servo.angle}° · PWM CH2
              </p>
            </div>

            {/* Buzzer */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  {buzzerOn ? (
                    <Volume2 className="size-3.5 text-emerald-400" aria-hidden />
                  ) : (
                    <VolumeX className="size-3.5 text-slate-500" aria-hidden />
                  )}
                  BUZZER
                </span>
                <Switch
                  checked={buzzerOn}
                  onCheckedChange={(v) => {
                    setBuzzerOn(v)
                    toast[v ? 'success' : 'info'](`Buzzer ${v ? 'enabled' : 'muted'} on MD-01`)
                  }}
                  aria-label="Toggle buzzer"
                />
              </div>
              <p className="mt-3 font-mono text-[10px] text-slate-500">2 kHz PASSIVE · GPIO 25</p>
              <Badge
                variant="outline"
                className={cn(
                  'mt-2 font-mono text-[10px]',
                  buzzerOn
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 text-slate-400'
                )}
              >
                {buzzerOn ? 'ACTIVE' : 'MUTED'}
              </Badge>
            </div>

            {/* Ultrasonic */}
            <div
              className={cn(
                'rounded-lg border p-3 transition-colors',
                bottleDetected ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-950/50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Radar className="size-3.5 text-emerald-400" aria-hidden />
                  ULTRASONIC HC-SR04
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-[10px]',
                    bottleDetected
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-slate-700 text-slate-400'
                  )}
                >
                  {bottleDetected ? 'BOTTLE DETECTED' : 'CLEAR'}
                </Badge>
              </div>
              <p className="mt-3 font-mono text-2xl font-black text-emerald-300" aria-live="polite">
                {distance.toFixed(1)}
                <span className="ml-1 text-xs font-semibold text-slate-500">cm</span>
              </p>
              <p className="font-mono text-[10px] text-slate-500">TRIG GPIO 26 · ECHO GPIO 27</p>
            </div>

            {/* RFID reader */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <ScanLine className="size-3.5 text-emerald-400" aria-hidden />
                  RFID RC522
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/50 bg-emerald-500/10 font-mono text-[10px] text-emerald-300"
                >
                  READY
                </Badge>
              </div>
              <p className="mt-3 font-mono text-[10px] text-slate-500">SPI · SS GPIO 5</p>
              <p className="mt-2 text-[11px] text-slate-400">Last scan: Juan D. · 2 min ago</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- System logs ---- */}
      <section aria-label="System logs and user activity">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
              <ScrollText className="size-4 text-emerald-400" aria-hidden />
              SYSTEM LOGS &amp; USER ACTIVITY
            </h3>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-emerald-400">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              STREAMING · AUTO-SCROLL
            </span>
          </div>

          <div ref={logBoxRef} className="md-scroll mt-4 max-h-96 overflow-y-auto rounded-lg border border-slate-800">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-900">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-24 font-mono text-[10px] tracking-[0.2em] text-slate-500">TIME</TableHead>
                  <TableHead className="w-20 text-[10px] tracking-[0.2em] text-slate-500">TYPE</TableHead>
                  <TableHead className="w-20 font-mono text-[10px] tracking-[0.2em] text-slate-500">NODE</TableHead>
                  <TableHead className="text-[10px] tracking-[0.2em] text-slate-500">MESSAGE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id} className="border-slate-800/70">
                    <TableCell className="font-mono text-xs text-slate-500">{l.time}</TableCell>
                    <TableCell>
                      <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider', LOG_STYLES[l.type])}>
                        {l.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">{l.station}</TableCell>
                    <TableCell className="text-xs text-slate-300">{l.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  )
}
