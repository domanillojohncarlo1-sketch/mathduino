'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Coins, ShoppingBag } from 'lucide-react'
import { SHOP_ITEMS, type ShopItem } from '@/lib/mathduino'
import { cn } from '@/lib/utils'

interface RewardShopProps {
  points: number
  stock: Record<string, number>
  onRedeem: (item: ShopItem) => void
}

export default function RewardShop({ points, stock, onRedeem }: RewardShopProps) {
  return (
    <div className="space-y-4">
      {/* Balance strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-slate-300">
          <ShoppingBag className="size-4 text-emerald-400" aria-hidden />
          Earn points by recycling at any MathDuino station, then spend them here.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.25)]">
          <Coins className="size-3.5" aria-hidden />
          BALANCE: {points} PTS
        </span>
      </div>

      {/* Item grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SHOP_ITEMS.map((item) => {
          const left = stock[item.id] ?? 0
          const soldOut = left <= 0
          const affordable = points >= item.points && !soldOut
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className={cn(
                'group relative flex flex-col rounded-xl border bg-slate-900/60 p-4 transition-all',
                affordable
                  ? 'border-slate-800 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]'
                  : 'border-slate-800/70 opacity-90'
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                  <Icon className="size-6" aria-hidden />
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono',
                    soldOut
                      ? 'border-red-500/40 bg-red-500/10 text-red-300'
                      : 'border-slate-700 text-slate-400'
                  )}
                >
                  {soldOut ? 'SOLD OUT' : `${left} LEFT`}
                </Badge>
              </div>

              <h4 className="mt-3 text-sm font-semibold text-slate-100">{item.name}</h4>
              <p className="text-xs text-slate-500">{item.tag}</p>

              <p className="mt-2 flex items-center gap-1.5 font-mono text-base font-bold text-emerald-300">
                <Coins className="size-4" aria-hidden />
                {item.points} PTS
              </p>

              <Button
                size="sm"
                disabled={!affordable}
                onClick={() => onRedeem(item)}
                className={cn(
                  'mt-3 w-full font-bold tracking-wider',
                  affordable &&
                    'bg-emerald-500 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:shadow-[0_0_22px_rgba(16,185,129,0.45)]',
                  !affordable && 'bg-slate-800/70 text-slate-500 hover:bg-slate-800/70'
                )}
              >
                {soldOut
                  ? 'SOLD OUT'
                  : affordable
                    ? 'REDEEM'
                    : `NEED ${item.points - points} MORE PTS`}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
