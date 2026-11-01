'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { authRequest } from '@/lib/auth-types'
import {
  Copy,
  Cpu,
  Loader2,
  Monitor,
  Radar,
  RadioTower,
  Save,
  Send,
  Volume2,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs font-semibold tracking-[0.15em] text-slate-400">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
    </div>
  )
}

function SliderRow({
  icon: Icon,
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  icon: LucideIcon
  label: string
  value: number
  display: string
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Icon className="size-3.5 text-emerald-400" aria-hidden />
          {label}
        </span>
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-300">
          {display}
        </Badge>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => onChange(vals[0])}
        className="mt-3 [&_[data-slot=slider-track]]:bg-slate-800 [&_[data-slot=slider-range]]:bg-emerald-400"
        aria-label={label}
      />
    </div>
  )
}

interface DeviceApiInfo {
  endpoint: string
  method: string
  keyHeader: string
  key: string
  payload: { rfid: string; type: string }
}

export default function HardwareConfigView() {
  const [deviceApi, setDeviceApi] = useState<DeviceApiInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    authRequest<DeviceApiInfo>('/api/admin/device')
      .then((d) => {
        if (!cancelled) setDeviceApi(d)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const copyDeviceField = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied to clipboard`)
    } catch {
      toast.error('Clipboard unavailable — copy it manually.')
    }
  }

  const [stationId, setStationId] = useState('MD-01')
  const [location, setLocation] = useState('Library Corridor')
  const [ssid, setSsid] = useState('MATHDUINO-NET')
  const [pass, setPass] = useState('ecotech2025')
  const [i2c, setI2c] = useState('0x27')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [pointsPerBottle, setPointsPerBottle] = useState(10)
  const [servoAngle, setServoAngle] = useState(95)
  const [buzzerMs, setBuzzerMs] = useState(300)
  const [usThreshold, setUsThreshold] = useState(12)
  const [backlight, setBacklight] = useState(true)
  const [autoSleep, setAutoSleep] = useState(false)

  const [pushing, setPushing] = useState(false)
  const [progress, setProgress] = useState(0)
  const pushTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(
    () => () => {
      if (pushTimer.current) clearInterval(pushTimer.current)
    },
    []
  )

  const pushConfig = () => {
    if (pushing) return
    setPushing(true)
    setProgress(0)
    pushTimer.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 12 + Math.random() * 8
        if (next >= 100) {
          if (pushTimer.current) clearInterval(pushTimer.current)
          setPushing(false)
          toast.success('Configuration pushed to ESP32 via Wi-Fi (OTA)')
          return 100
        }
        return next
      })
    }, 140)
  }

  const inputCls =
    'border-slate-800 bg-slate-900/70 text-sm text-slate-200 placeholder:text-slate-600 focus-visible:ring-emerald-500/40'
  const selectCls =
    'w-full border-slate-800 bg-slate-900/70 text-sm text-slate-200 focus-visible:ring-emerald-500/40'

  return (
    <div className="space-y-4">
      {/* Device sync API — what the ESP32 firmware calls on every deposit */}
      <section
        aria-label="Device sync API"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-300">
            <RadioTower className="size-4 text-emerald-400" aria-hidden />
            DEVICE SYNC API · MD-01 → WEB
          </h3>
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[9px] tracking-widest text-emerald-300">
            LIVE BOTTLE SYNC
          </Badge>
        </div>
        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-slate-500">
          Your ESP32 posts every accepted bottle here (student RFID scanned at the machine).
          The web portal picks it up within seconds — points, bottles and LCD mirror update
          automatically. Copy these values into your firmware constants.
        </p>
        {deviceApi ? (
          <div className="mt-3 grid gap-2 font-mono text-[11px] text-slate-300">
            {[
              { label: 'ENDPOINT', value: `${deviceApi.method} ${deviceApi.endpoint}` },
              { label: 'DEVICE KEY HEADER', value: `${deviceApi.keyHeader}: ${deviceApi.key}` },
              {
                label: 'REQUEST BODY',
                value: JSON.stringify(deviceApi.payload),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <p className="min-w-0 truncate">
                  <span className="mr-2 text-[9px] tracking-[0.2em] text-slate-500">{row.label}</span>
                  <span className="text-emerald-200/90">{row.value}</span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Copy ${row.label.toLowerCase()}`}
                  onClick={() => copyDeviceField(row.label, row.value)}
                  className="size-7 shrink-0 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500" aria-busy="true">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading device credentials…
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Device identity */}
        <section aria-label="Device identity" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
            <Cpu className="size-4 text-emerald-400" aria-hidden />
            DEVICE IDENTITY
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="cfg-station" label="STATION ID">
              <Input id="cfg-station" value={stationId} onChange={(e) => setStationId(e.target.value)} className={inputCls} />
            </Field>
            <Field id="cfg-location" label="LOCATION">
              <Input id="cfg-location" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
            </Field>
            <Field id="cfg-ppb" label="POINTS PER BOTTLE" hint="Awarded on every accepted deposit">
              <Input
                id="cfg-ppb"
                type="number"
                min={1}
                max={100}
                value={pointsPerBottle}
                onChange={(e) => setPointsPerBottle(Math.max(1, Number(e.target.value) || 1))}
                className={inputCls}
              />
            </Field>
            <Field id="cfg-diff" label="QUIZ DIFFICULTY" hint="Served on the LCD during sessions">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="cfg-diff" className={selectCls} aria-label="Quiz difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
                  <SelectItem value="EASY">EASY — grade 4</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM — grades 5-6</SelectItem>
                  <SelectItem value="HARD">HARD — grade 6 olympiad</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        {/* Network */}
        <section aria-label="Network settings" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
            <Wifi className="size-4 text-emerald-400" aria-hidden />
            NETWORK &amp; CONNECTIVITY
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="cfg-ssid" label="WI-FI SSID">
              <Input id="cfg-ssid" value={ssid} onChange={(e) => setSsid(e.target.value)} className={inputCls} />
            </Field>
            <Field id="cfg-pass" label="WI-FI PASSWORD">
              <Input id="cfg-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="mt-4 grid gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 font-mono text-[11px] text-slate-400">
            <p>MQTT BROKER · mqtt://192.168.1.10:1883 <span className="text-emerald-400">CONNECTED</span></p>
            <p>NTP SERVER · time.google.com <span className="text-emerald-400">SYNCED</span></p>
            <p>SIGNAL · -48 dBm <span className="text-emerald-400">STRONG</span></p>
          </div>
        </section>

        {/* Peripherals */}
        <section aria-label="Peripheral configuration" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-slate-400">
            <Monitor className="size-4 text-emerald-400" aria-hidden />
            PERIPHERALS &amp; CALIBRATION
          </h3>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="cfg-i2c" label="LCD I2C ADDRESS">
                <Select value={i2c} onValueChange={setI2c}>
                  <SelectTrigger id="cfg-i2c" className={selectCls} aria-label="LCD I2C address">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
                    <SelectItem value="0x27">0x27 — PCF8574</SelectItem>
                    <SelectItem value="0x3F">0x3F — PCF8574A</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid content-end gap-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <Label htmlFor="cfg-backlight" className="text-xs font-semibold text-slate-300">
                    LCD BACKLIGHT
                  </Label>
                  <Switch id="cfg-backlight" checked={backlight} onCheckedChange={setBacklight} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div>
                    <Label htmlFor="cfg-sleep" className="text-xs font-semibold text-slate-300">
                      AUTO-SLEEP (30 min)
                    </Label>
                    <p className="text-[10px] text-slate-600">Deep sleep when idle</p>
                  </div>
                  <Switch id="cfg-sleep" checked={autoSleep} onCheckedChange={setAutoSleep} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
              <SliderRow icon={Monitor} label="SERVO OPEN ANGLE" value={servoAngle} display={`${servoAngle}°`} min={40} max={180} onChange={setServoAngle} />
              <SliderRow icon={Volume2} label="BUZZER DURATION" value={buzzerMs} display={`${buzzerMs} ms`} min={50} max={1000} step={50} onChange={setBuzzerMs} />
              <SliderRow
                icon={Radar}
                label="ULTRASONIC TRIGGER"
                value={usThreshold}
                display={`< ${usThreshold} cm`}
                min={5}
                max={30}
                onChange={setUsThreshold}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="max-w-md text-[11px] leading-relaxed text-slate-500">
          Saving keeps the draft locally. <span className="text-slate-300">Push to ESP32</span> flashes the
          running firmware over Wi-Fi — the station restarts with the new settings.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={() => toast.success('Configuration saved locally')}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Save className="size-4" aria-hidden />
            SAVE CONFIG
          </Button>
          <Button
            onClick={pushConfig}
            disabled={pushing}
            className="bg-emerald-500 font-bold tracking-wider text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
          >
            {pushing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            {pushing ? 'PUSHING…' : 'PUSH TO ESP32'}
          </Button>
        </div>
      </div>

      {pushing && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between font-mono text-[11px] text-emerald-300">
            <span>OTA UPLOAD · {stationId}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
