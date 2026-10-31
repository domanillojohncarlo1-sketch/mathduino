'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Ban, CheckCircle2, Plus, Search, UserPlus, Users } from 'lucide-react'
import { STUDENTS_INITIAL, randInt, type StudentRecord } from '@/lib/mathduino'

export default function UsersView() {
  const [students, setStudents] = useState<StudentRecord[]>(STUDENTS_INITIAL)
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('Grade 5')
  const [newSection, setNewSection] = useState('Molave')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rfid.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q)
    )
  }, [students, query])

  const addPoints = (s: StudentRecord) => {
    setStudents((prev) => prev.map((p) => (p.id === s.id ? { ...p, points: p.points + 10 } : p)))
    toast.success(`+10 PTS added for ${s.name}`)
  }

  const toggleStatus = (s: StudentRecord) => {
    const next = s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    setStudents((prev) => prev.map((p) => (p.id === s.id ? { ...p, status: next } : p)))
    toast[next === 'ACTIVE' ? 'success' : 'info'](
      next === 'ACTIVE' ? `${s.name} re-activated` : `${s.name} suspended — card will be rejected`
    )
  }

  const enroll = () => {
    const name = newName.trim()
    if (!name) return
    const rfid = `RF-${randInt(1000, 9999)}`
    const record: StudentRecord = {
      id: `S${Date.now()}`,
      rfid,
      name,
      grade: newGrade,
      section: newSection,
      points: 0,
      bottles: 0,
      status: 'ACTIVE',
    }
    setStudents((prev) => [...prev, record])
    setNewName('')
    toast.success(`${name} enrolled — RFID card ${rfid} assigned`)
  }

  const activeCount = students.filter((s) => s.status === 'ACTIVE').length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, RFID or section…"
            aria-label="Search students"
            className="border-slate-800 bg-slate-900/70 pl-9 text-sm text-slate-200 placeholder:text-slate-600 focus-visible:ring-emerald-500/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-slate-700 font-mono text-[10px] text-slate-400"
          >
            {activeCount}/{students.length} ACTIVE
          </Badge>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-emerald-500 font-bold tracking-wider text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:bg-emerald-400"
              >
                <UserPlus className="size-3.5" aria-hidden />
                ADD STUDENT
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="tracking-[0.15em] text-emerald-300">ENROLL NEW STUDENT</DialogTitle>
                <DialogDescription className="text-slate-400">
                  An RFID card will be assigned automatically on first scan at any station.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="student-name" className="text-slate-300">Full name</Label>
                  <Input
                    id="student-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Isabela Cruz"
                    className="border-slate-800 bg-slate-900/70 text-slate-200 focus-visible:ring-emerald-500/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="student-grade" className="text-slate-300">Grade</Label>
                    <Input
                      id="student-grade"
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                      className="border-slate-800 bg-slate-900/70 text-slate-200 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="student-section" className="text-slate-300">Section</Label>
                    <Input
                      id="student-section"
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      className="border-slate-800 bg-slate-900/70 text-slate-200 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    onClick={enroll}
                    disabled={!newName.trim()}
                    className="bg-emerald-500 font-bold tracking-wider text-slate-950 hover:bg-emerald-400"
                  >
                    <UserPlus className="size-3.5" aria-hidden />
                    ENROLL
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="md-scroll max-h-[32rem] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-[10px] tracking-[0.2em] text-slate-500">STUDENT</TableHead>
              <TableHead className="text-[10px] tracking-[0.2em] text-slate-500">RFID</TableHead>
              <TableHead className="text-[10px] tracking-[0.2em] text-slate-500">GRADE</TableHead>
              <TableHead className="text-right text-[10px] tracking-[0.2em] text-slate-500">POINTS</TableHead>
              <TableHead className="text-right text-[10px] tracking-[0.2em] text-slate-500">BOTTLES</TableHead>
              <TableHead className="text-[10px] tracking-[0.2em] text-slate-500">STATUS</TableHead>
              <TableHead className="text-right text-[10px] tracking-[0.2em] text-slate-500">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="border-slate-800/70">
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-lime-600 text-[10px] font-black text-slate-950">
                      {s.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{s.name}</span>
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-emerald-400/90">{s.rfid}</TableCell>
                <TableCell className="text-xs text-slate-400">
                  {s.grade} · {s.section}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-slate-200">{s.points}</TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-400">{s.bottles}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      s.status === 'ACTIVE'
                        ? 'border-emerald-500/40 bg-emerald-500/10 font-mono text-[9px] text-emerald-300'
                        : 'border-red-500/40 bg-red-500/10 font-mono text-[9px] text-red-300'
                    }
                  >
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPoints(s)}
                      className="h-7 border-slate-700 px-2 text-[11px] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                      aria-label={`Add 10 points to ${s.name}`}
                    >
                      <Plus className="size-3" aria-hidden />
                      10 PTS
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleStatus(s)}
                      className={
                        s.status === 'ACTIVE'
                          ? 'h-7 px-2 text-[11px] text-slate-400 hover:bg-red-500/10 hover:text-red-300'
                          : 'h-7 px-2 text-[11px] text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                      }
                      aria-label={s.status === 'ACTIVE' ? `Suspend ${s.name}` : `Activate ${s.name}`}
                    >
                      {s.status === 'ACTIVE' ? (
                        <>
                          <Ban className="size-3" aria-hidden />
                          Suspend
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3" aria-hidden />
                          Activate
                        </>
                      )}
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="border-slate-800/70 hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center">
                  <span className="inline-flex flex-col items-center gap-2 text-slate-500">
                    <Users className="size-5" aria-hidden />
                    <span className="text-xs">No students match “{query}”.</span>
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
