'use client'

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
  Cpu,
  Loader2,
  MapPin,
  MemoryStick,
  Radar,
  RefreshCw,
  RotateCw,
  Rss,
  ScanLine,
  ScrollText,
  Thermometer,
  Volume2,
  VolumeX,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STATIONS_INITIAL,
  clamp,
  initialLogs,
  makeLog,
  meanRevert,
  rand,
  randInt,
  type LogEntry,
  type LogType,
  type RecyclerStation,
  type StationStatus,
} from '@/lib/mathduino'

/* ================= Telemetry ================= */

const HIST = 24

interface Telemetry {
  cpu: number
  ram: number
  temp: number
  cpuHist: number[]
  ramHist: number[]
  tempHist: number[]
}

const seedHist = (v: number, jitter: number) =>
  Array.from({ length: HIST }, () => clamp(v + rand(-jitter, jitter), 0, 100))

function pushHist(h: number[], v: number): number[] {
  return [...h.slice(-(HIST - 1)), v]
}

function Sparkline({ data, min, max }: { data: number[]; min: number; max: number }) {
  const w = 120
  const h = 34
  const span = Math.max(1e-6, max - min)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = clamp(h - ((v - min) / span) * h, 1, h - 1)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="rgba(16,185,129,0.12)" />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="rgb(52,211,153)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TelemetryCard({
  icon: Icon,
  label,
  value,
  unit,
  pct,
  hist,
  min,
  max,
  sub,
}: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
  pct: number
  hist: number[]
  min: number
  max: number
  sub: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-slate-400">
          <Icon className="size-4 text-emerald-400" aria-hidden />
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-emerald-400">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          LIVE
        </span>
      </div>
      <p className="mt-3 font-mono text-3xl font-black text-emerald-300 md-text-glow" aria-live="polite">
        {value}
        <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3">
        <Sparkline data={hist} min={min} max={max} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{sub}</p>
    </div>
  )
}

/* ================= Logs ================= */

const LOG_STYLES: Record<LogType, string> = {
  RFID: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  ERROR: 'text-red-300 border-red-500/40 bg-red-500/10',
  WARN: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  INFO: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  SERVO: 'text-teal-300 border-teal-500/40 bg-teal-500/10',
  QUIZ: 'text-lime-300 border-lime-500/40 bg-lime-500/10',
}

/* ================= Stations ================= */

const STATUS_META: Record<StationStatus, { label: string; dot: string; text: string }> = {
  ONLINE: { label: 'ONLINE', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  NEEDS_RESET: { label: 'NEEDS RESET', dot: 'bg-amber-400', text: 'text-amber-300' },
  REBOOTING: { label: 'REBOOTING', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300' },
  OFFLINE: { label: 'OFFLINE', dot: 'bg-red-500', text: 'text-red-400' },
}

/* ================= Live view ================= */

export default function LiveView() {
  // --- telemetry ---
  const [tele, setTele] = useState<Telemetry>(() => ({
    cpu: 54,
    ram: 72,
    temp: 32,
    cpuHist: seedHist(54, 4),
    ramHist: seedHist(72, 3),
    tempHist: seedHist(32, 0.6),
  }))

  useEffect(() => {
    const t = setInterval(() => {
      setTele((prev) => {
        const cpu = meanRevert(prev.cpu, 54, 0.12, 4, 22, 92)
        const ram = meanRevert(prev.ram, 72, 0.1, 3, 48, 93)
        const temp = meanRevert(prev.temp, 32, 0.15, 0.7, 27, 40)
        return {
          cpu,
          ram,
          temp,
          cpuHist: pushHist(prev.cpuHist, cpu),
          ramHist: pushHist(prev.ramHist, ram),
          tempHist: pushHist(prev.tempHist, temp),
        }
      })
    }, 2000)
    return () => clearInterval(t)
  }, [])

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

  // --- stations ---
  const [stations, setStations] = useState<RecyclerStation[]>(STATIONS_INITIAL)

  const updateStation = (id: string, patch: Partial<RecyclerStation>) =>
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const ping = (s: RecyclerStation) =>
    toast.success(`${s.id} responded in ${randInt(18, 90)} ms`)

  const reboot = (s: RecyclerStation) => {
    if (s.status === 'REBOOTING') return
    updateStation(s.id, { status: 'REBOOTING' })
    toast.info(`${s.id}: reboot sequence started…`)
    setTimeout(() => {
      updateStation(s.id, { status: 'ONLINE', uptime: '0d 00:01' })
      toast.success(`${s.id} is back online`)
    }, 3200)
  }

  const onlineCount = stations.filter((s) => s.status === 'ONLINE').length

  return (
    <div className="space-y-6">
      {/* ---- Telemetry row ---- */}
      <section aria-label="Station controller telemetry" className="grid gap-4 sm:grid-cols-3">
        <TelemetryCard
          icon={Cpu}
          label="CPU LOAD"
          value={`${Math.round(tele.cpu)}`}
          unit="%"
          pct={tele.cpu}
          hist={tele.cpuHist}
          min={0}
          max={100}
          sub="ESP32-S3 @ 240 MHz · dual core"
        />
        <TelemetryCard
          icon={MemoryStick}
          label="RAM USAGE"
          value={`${Math.round(tele.ram)}`}
          unit="%"
          pct={tele.ram}
          hist={tele.ramHist}
          min={0}
          max={100}
          sub="512 KB SRAM · heap fragmenting OK"
        />
        <TelemetryCard
          icon={Thermometer}
          label="CORE TEMP"
          value={tele.temp.toFixed(1)}
          unit="°C"
          pct={clamp(((tele.temp - 20) / 30) * 100, 0, 100)}
          hist={tele.tempHist}
          min={24}
          max={42}
          sub="Thermal threshold alarm at 55 °C"
        />
      </section>

      {/* ---- Hardware + stations row ---- */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Hardware status */}
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

        {/* Station overview */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
              <Rss className="size-4 text-emerald-400" aria-hidden />
              STATION OVERVIEW
            </h3>
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-[10px]',
                onlineCount === stations.length
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              )}
            >
              {onlineCount}/{stations.length} ONLINE
            </Badge>
          </div>

          <ul className="mt-4 space-y-3">
            {stations.map((s) => {
              const meta = STATUS_META[s.status]
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} aria-hidden />
                      <span className="truncate text-xs font-bold text-slate-200">
                        {s.name}
                        <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-500">
                          {s.id}
                        </span>
                      </span>
                      <span className={cn('font-mono text-[9px] font-bold tracking-[0.15em]', meta.text)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden />
                        {s.location}
                      </span>
                      <span className="font-mono">{s.ip}</span>
                      <span>{s.bottlesToday} bottles today</span>
                      <span className="font-mono">UP {s.uptime}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {s.status === 'ONLINE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ping(s)}
                        className="h-7 border-slate-700 px-2.5 text-[11px] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                      >
                        <RefreshCw className="size-3" aria-hidden />
                        Ping
                      </Button>
                    )}
                    {(s.status === 'NEEDS_RESET' || s.status === 'OFFLINE' || s.status === 'REBOOTING') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={s.status === 'REBOOTING'}
                        onClick={() => reboot(s)}
                        className={cn(
                          'h-7 px-2.5 text-[11px]',
                          s.status === 'REBOOTING'
                            ? 'border-slate-800 text-slate-500'
                            : 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                        )}
                      >
                        {s.status === 'REBOOTING' ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                        ) : (
                          <RefreshCw className="size-3" aria-hidden />
                        )}
                        {s.status === 'REBOOTING' ? 'Rebooting…' : s.status === 'OFFLINE' ? 'Reboot' : 'Reset'}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
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
