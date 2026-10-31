// ============================================================
// MathDuino — shared types, mock data & simulation helpers
// ============================================================

import type { LucideIcon } from 'lucide-react'
import {
  Backpack,
  Calculator,
  CupSoda,
  Notebook,
  Palette,
  PenTool,
  Pencil,
  Ruler,
} from 'lucide-react'

export type PortalView = 'landing' | 'student' | 'admin'

/* ---------------- Student profile ---------------- */

export interface StudentProfile {
  name: string
  initials: string
  firstNameLcd: string
  grade: string
  section: string
  rfid: string
}

export const STUDENT: StudentProfile = {
  name: 'Juan Dela Cruz',
  initials: 'JD',
  firstNameLcd: 'JUAN',
  grade: 'Grade 6',
  section: 'Sampaguita',
  rfid: 'RF-8823-1145',
}

export const GOAL_BOTTLES = 50
export const POINTS_PER_BOTTLE = 10
export const BONUS_PER_CORRECT = 5

/* ---------------- Reward shop ---------------- */

export interface ShopItem {
  id: string
  name: string
  icon: LucideIcon
  points: number
  stock: number
  tag: string
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'pencil', name: 'Custom Pencil', icon: Pencil, points: 50, stock: 24, tag: 'Recycled casing' },
  { id: 'ruler', name: 'Bamboo Ruler', icon: Ruler, points: 60, stock: 15, tag: 'Locally sourced' },
  { id: 'crayons', name: 'Recycled Crayons', icon: Palette, points: 80, stock: 18, tag: 'Pack of 12' },
  { id: 'notebook', name: 'Eco-Notebook', icon: Notebook, points: 120, stock: 10, tag: 'Seed paper cover' },
  { id: 'pen', name: 'Plantable Pen Set', icon: PenTool, points: 150, stock: 8, tag: 'Grow basil at home' },
  { id: 'calculator', name: 'Solar Calculator', icon: Calculator, points: 300, stock: 5, tag: 'Battery-free' },
  { id: 'tumbler', name: 'Eco Tumbler', icon: CupSoda, points: 450, stock: 4, tag: '750 ml stainless' },
  { id: 'tote', name: 'Eco Tote Pouch', icon: Backpack, points: 500, stock: 3, tag: 'Upcycled fabric' },
]

/* ---------------- Admin: stations ---------------- */

export type StationStatus = 'ONLINE' | 'NEEDS_RESET' | 'REBOOTING' | 'OFFLINE'

export interface RecyclerStation {
  id: string
  name: string
  location: string
  ip: string
  status: StationStatus
  bottlesToday: number
  uptime: string
}

export const STATIONS_INITIAL: RecyclerStation[] = [
  { id: 'MD-01', name: 'Station 1', location: 'Library Corridor', ip: '192.168.1.81', status: 'ONLINE', bottlesToday: 42, uptime: '14d 06:22' },
  { id: 'MD-02', name: 'Station 2', location: 'Canteen', ip: '192.168.1.82', status: 'NEEDS_RESET', bottlesToday: 27, uptime: '2d 11:04' },
  { id: 'MD-03', name: 'Station 3', location: 'Science Wing', ip: '192.168.1.83', status: 'OFFLINE', bottlesToday: 0, uptime: '—' },
]

/* ---------------- Admin: student records ---------------- */

export interface StudentRecord {
  id: string
  rfid: string
  name: string
  grade: string
  section: string
  points: number
  bottles: number
  status: 'ACTIVE' | 'SUSPENDED'
}

export const STUDENTS_INITIAL: StudentRecord[] = [
  { id: 'S1', rfid: 'RF-8823', name: 'Juan Dela Cruz', grade: 'Grade 6', section: 'Sampaguita', points: 220, bottles: 15, status: 'ACTIVE' },
  { id: 'S2', rfid: 'RF-1042', name: 'Maria Santos', grade: 'Grade 6', section: 'Sampaguita', points: 385, bottles: 27, status: 'ACTIVE' },
  { id: 'S3', rfid: 'RF-3344', name: 'Sofia Ramos', grade: 'Grade 5', section: 'Molave', points: 460, bottles: 33, status: 'ACTIVE' },
  { id: 'S4', rfid: 'RF-2210', name: 'Andrea Reyes', grade: 'Grade 5', section: 'Molave', points: 140, bottles: 9, status: 'ACTIVE' },
  { id: 'S5', rfid: 'RF-7715', name: 'Carlo Mendoza', grade: 'Grade 6', section: 'Sampaguita', points: 90, bottles: 6, status: 'ACTIVE' },
  { id: 'S6', rfid: 'RF-9031', name: 'Liam Villanueva', grade: 'Grade 6', section: 'Acacia', points: 55, bottles: 3, status: 'SUSPENDED' },
  { id: 'S7', rfid: 'RF-5567', name: 'Ella Navarro', grade: 'Grade 5', section: 'Acacia', points: 210, bottles: 14, status: 'ACTIVE' },
  { id: 'S8', rfid: 'RF-6620', name: 'Noah Garcia', grade: 'Grade 6', section: 'Molave', points: 305, bottles: 21, status: 'ACTIVE' },
]

/* ---------------- Admin: system logs ---------------- */

export type LogType = 'RFID' | 'QUIZ' | 'SERVO' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  id: number
  time: string
  type: LogType
  station: string
  message: string
}

const LOG_POOL: Array<Omit<LogEntry, 'id' | 'time'>> = [
  { type: 'RFID', station: 'MD-01', message: 'Card RF-8823 accepted — Juan D. +20 PTS' },
  { type: 'RFID', station: 'MD-02', message: 'Card RF-3344 accepted — Sofia R. +20 PTS' },
  { type: 'RFID', station: 'MD-01', message: 'Card RF-1042 accepted — Maria S. +20 PTS' },
  { type: 'RFID', station: 'MD-02', message: 'Card RF-2210 accepted — Andrea R. +20 PTS' },
  { type: 'RFID', station: 'MD-01', message: 'Card RF-6620 accepted — Noah G. +20 PTS' },
  { type: 'QUIZ', station: 'MD-01', message: 'Juan D. scored 4/5 on practice set #12' },
  { type: 'QUIZ', station: 'MD-02', message: 'Maria S. scored 5/5 — streak extended' },
  { type: 'QUIZ', station: 'MD-01', message: 'Practice session started — 5 questions' },
  { type: 'SERVO', station: 'MD-01', message: 'Lid actuated 0° → 95° (bottle accepted)' },
  { type: 'SERVO', station: 'MD-02', message: 'Lid actuated 0° → 95° (bottle accepted)' },
  { type: 'SERVO', station: 'MD-01', message: 'Homing cycle complete — servo OK' },
  { type: 'INFO', station: 'MD-01', message: 'Heartbeat OK — MQTT broker connected' },
  { type: 'INFO', station: 'MD-02', message: 'Wi-Fi RSSI -48 dBm — signal strong' },
  { type: 'INFO', station: 'MD-01', message: 'NTP time sync complete' },
  { type: 'WARN', station: 'MD-02', message: 'Bin level at 86% — schedule pickup' },
  { type: 'WARN', station: 'MD-01', message: 'Ultrasonic echo jitter — recalibrating' },
  { type: 'ERROR', station: 'MD-03', message: 'Ping timeout — station unreachable' },
  { type: 'ERROR', station: 'MD-02', message: 'Ultrasonic HC-SR04 timeout on intake bay' },
]

let logSeq = 0

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-PH', { hour12: false })
}

export function makeLog(at: Date = new Date()): LogEntry {
  const pick = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)]
  logSeq += 1
  return { id: logSeq, time: fmtTime(at), ...pick }
}

export function initialLogs(count = 9): LogEntry[] {
  const now = Date.now()
  let t = now - count * 14000
  return Array.from({ length: count }, () => {
    t += randInt(5000, 15000)
    return makeLog(new Date(t))
  })
}

/* ---------------- Quiz ---------------- */

export interface QuizQuestion {
  prompt: string
  options: number[]
  answerIndex: number
}

export const QUIZ_LENGTH = 5
export const QUIZ_TIME = 20

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateQuiz(count = QUIZ_LENGTH): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const seen = new Set<string>()
  const ops = ['+', '-', '×', '÷'] as const

  while (questions.length < count) {
    const op = ops[randInt(0, ops.length - 1)]
    let a: number
    let b: number
    let ans: number

    switch (op) {
      case '+':
        a = randInt(12, 99)
        b = randInt(12, 99)
        ans = a + b
        break
      case '-':
        a = randInt(30, 99)
        b = randInt(11, a - 2)
        ans = a - b
        break
      case '×':
        a = randInt(3, 12)
        b = randInt(3, 12)
        ans = a * b
        break
      default:
        b = randInt(3, 9)
        ans = randInt(3, 12)
        a = b * ans
        break
    }

    const prompt = `${a} ${op} ${b} = ?`
    if (seen.has(prompt)) continue
    seen.add(prompt)

    const opts = new Set<number>([ans])
    while (opts.size < 4) {
      const cand = ans + randInt(1, 9) * (Math.random() < 0.5 ? -1 : 1)
      if (cand > 0) opts.add(cand)
    }
    const options = shuffle([...opts])
    questions.push({ prompt, options, answerIndex: options.indexOf(ans) })
  }

  return questions
}

/* ---------------- Reports ---------------- */

export interface WeeklyPoint {
  day: string
  value: number
}

export const WEEKLY_BOTTLES: WeeklyPoint[] = [
  { day: 'Mon', value: 210 },
  { day: 'Tue', value: 168 },
  { day: 'Wed', value: 245 },
  { day: 'Thu', value: 198 },
  { day: 'Fri', value: 302 },
  { day: 'Sat', value: 86 },
  { day: 'Sun', value: 64 },
]

/* ---------------- Helpers ---------------- */

export const rand = (min: number, max: number) => Math.random() * (max - min) + min

export const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/** Random-walk that gently drifts back toward a target value (for fake telemetry). */
export const meanRevert = (cur: number, target: number, pull: number, jitter: number, min: number, max: number) =>
  clamp(cur + (target - cur) * pull + rand(-jitter, jitter), min, max)

/** Pad a string to exactly n columns for the 16x2 LCD replica. */
export const pad16 = (s: string, n = 16) =>
  s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
