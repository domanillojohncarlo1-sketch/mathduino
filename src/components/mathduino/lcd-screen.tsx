'use client'

import { cn } from '@/lib/utils'
import { pad16 } from '@/lib/mathduino'

interface LcdScreenProps {
  title: string
  address?: string
  line1: string
  line2: string
  cursor?: boolean
  className?: string
}

/**
 * Pixel-styled replica of a 16x2 I2C character LCD
 * (green-on-dark eco variant with scanline overlay + blinking cursor).
 */
export default function LcdScreen({
  title,
  address = 'I2C · 0x27',
  line1,
  line2,
  cursor = true,
  className,
}: LcdScreenProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-slate-500">
        <span>{title}</span>
        <span>{address}</span>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-[#03130b] p-4 shadow-[inset_0_0_28px_rgba(16,185,129,0.16),0_0_22px_rgba(16,185,129,0.14)] sm:p-5">
        <div aria-hidden className="md-lcd-scan pointer-events-none absolute inset-0 opacity-60" />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-emerald-400/10" />
        <div className="relative font-mono text-sm font-semibold text-emerald-300 md-text-glow sm:text-base">
          <p className="whitespace-pre tracking-[0.3em]">{pad16(line1)}</p>
          <p className="mt-2 whitespace-pre tracking-[0.3em]">
            {pad16(line2, cursor ? 15 : 16)}
            {cursor && <span className="md-blink">█</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
