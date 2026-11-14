import { IndianRupee } from 'lucide-react'

import type { Spend } from '@/api/dashboard'
import { formatCurrency } from '@/lib/format'

function Bars({ title, lines }: { title: string; lines: { name: string; amount: number }[] }) {
  const max = Math.max(1, ...lines.map((l) => l.amount))
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {lines.map((l) => (
            <li key={l.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{l.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(l.amount)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(l.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** What the PELs ordered in the period cost -- only ever rendered for someone the server sent amounts to (the company admin). */
export function SpendCard({ spend }: { spend: Spend }) {
  const change = spend.previousTotal && spend.previousTotal > 0 ? ((spend.total - spend.previousTotal) / spend.previousTotal) * 100 : null
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <IndianRupee className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Spend</h2>
          <p className="text-xs text-muted-foreground">PELs ordered in this period, cancelled ones left out</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-2xl leading-none font-bold tabular-nums">{formatCurrency(spend.total)}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Total
            {change !== null && <span className={change > 0 ? ' text-warning' : ' text-success'}> · {change > 0 ? 'up' : 'down'} {Math.abs(Math.round(change))}%</span>}
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-2xl leading-none font-bold tabular-nums">{formatCurrency(spend.costPerPel)}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Average per PEL</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Bars title="By PEL" lines={spend.byGift} />
        <Bars title="By area" lines={spend.byUnit} />
      </div>
    </section>
  )
}
