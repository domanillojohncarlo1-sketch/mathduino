'use client'

// ============================================================
// MathDuino — Admin · Reset Demo Data button (header control)
// One click wipes the demo back to its factory zero-state:
//   · every reward order deleted
//   · every account except the two seeded demo accounts removed
//   · every student back to 0 bottles / 0 points
// Use it right before (or between) defense demo runs so the
// first inserted bottle is always the first point earned.
// ============================================================

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RotateCcw } from 'lucide-react'
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
import { authRequest } from '@/lib/auth-types'

interface ResetResult {
  ok: boolean
  removedOrders: number
  removedUsers: number
  resetStudents: number
}

export default function DemoResetButton() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const runReset = async () => {
    if (busy) return
    setBusy(true)
    try {
      const r = await authRequest<ResetResult>('/api/admin/demo-reset', {})
      toast.success(
        `Demo reset — ${r.resetStudents} student(s) back to 0 bottles / 0 points · ` +
          `${r.removedOrders} order(s) cleared · ${r.removedUsers} extra account(s) removed.`
      )
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Demo reset failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-slate-700 px-2.5 font-mono text-[10px] tracking-[0.15em] text-slate-300 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">RESET DEMO</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="tracking-[0.15em] text-amber-300">RESET DEMO DATA?</DialogTitle>
          <DialogDescription className="text-slate-400">
            This puts the whole demo back to its factory zero-state:
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
          <li>Deletes <span className="font-semibold text-slate-100">every reward order</span></li>
          <li>
            Removes every account except{' '}
            <span className="font-mono text-emerald-400">admin@mathduino.io</span> and{' '}
            <span className="font-mono text-emerald-400">student@mathduino.io</span>
          </li>
          <li>Resets every student to <span className="font-semibold text-slate-100">0 bottles / 0 points</span></li>
        </ul>
        <p className="text-[11px] text-slate-500">
          After this, the first bottle inserted on the machine is the first point earned.
          You cannot undo this.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={busy} className="text-slate-400 hover:text-slate-200">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={runReset}
            disabled={busy}
            className="bg-amber-500 font-bold tracking-wider text-slate-950 hover:bg-amber-400"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="size-4" aria-hidden />
            )}
            RESET EVERYTHING
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
