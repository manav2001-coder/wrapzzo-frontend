import { ArrowDownRight, ArrowUpRight, Clock, FilePlus2, Minus, PackageCheck, Stethoscope } from 'lucide-react'
import type { ComponentType } from 'react'

import type { InsightPeriod } from '@/api/dashboard'
import { cn } from '@/lib/utils'

const count = (n: number) => n.toLocaleString('en-IN')

/** "up 12%" against the period before; for something where lower is better (days to deliver) the colours flip. */
function Delta({ now, before, lowerIsBetter = false }: { now: number; before: number | null | undefined; lowerIsBetter?: boolean }) {
  if (before === null || before === undefined) return null
  if (before === 0 && now === 0) return null
  const change = before === 0 ? null : ((now - before) / before) * 100
  const flat = change !== null && Math.abs(change) < 1
  const up = now > before
  const good = flat ? null : up !== lowerIsBetter
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  const text = change === null ? 'New' : flat ? 'No change' : `${Math.abs(Math.round(change))}%`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        good === null ? 'bg-muted text-muted-foreground' : good ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive',
      )}
      title="Compared with the period before"
    >
      <Icon className="h-3 w-3" aria-hidden />
      {text}
      <span className="sr-only">{up ? ' higher' : ' lower'} than the period before</span>
    </span>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  unit,
  caption,
  delta,
  tone,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  unit?: string
  caption: string
  delta: React.ReactNode
  tone: string
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm',
        onClick && 'transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
      )}
    >
      <div className={cn('pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-60 blur-2xl', tone)} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span className={cn('grid h-7 w-7 place-items-center rounded-lg text-primary', tone)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </span>
      </div>
      <div className="relative mt-3">
        <p className="flex items-baseline gap-1 text-3xl leading-none font-bold tracking-tight tabular-nums">
          {value}
          {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta}
          <span className="text-xs text-muted-foreground">{caption}</span>
        </div>
      </div>
    </Tag>
  )
}

/** The four numbers for the chosen period, each against the period before. Two across on a phone, four on a desktop. */
export function PeriodKpis({ current, previous, onSelect }: { current: InsightPeriod; previous: InsightPeriod | null; onSelect: (dimension: 'pelsRequested' | 'pelsServed') => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={FilePlus2}
        label="PELs requested"
        value={count(current.requested)}
        caption={current.doctorsRequested > 0 ? `${count(current.doctorsRequested)} ${current.doctorsRequested === 1 ? 'doctor' : 'doctors'}` : 'None yet'}
        delta={<Delta now={current.requested} before={previous?.requested} />}
        tone="bg-primary/10"
        onClick={current.requested > 0 ? () => onSelect('pelsRequested') : undefined}
      />
      <Tile
        icon={PackageCheck}
        label="PELs delivered"
        value={count(current.served)}
        caption={current.served > 0 ? 'reached doctors' : 'None yet'}
        delta={<Delta now={current.served} before={previous?.served} />}
        tone="bg-success/15"
        onClick={current.served > 0 ? () => onSelect('pelsServed') : undefined}
      />
      <Tile
        icon={Stethoscope}
        label="Doctors reached"
        value={count(current.doctorsServed)}
        caption="received a PEL"
        delta={<Delta now={current.doctorsServed} before={previous?.doctorsServed} />}
        tone="bg-sky-500/15"
        onClick={current.doctorsServed > 0 ? () => onSelect('pelsServed') : undefined}
      />
      <Tile
        icon={Clock}
        label="Time to deliver"
        value={current.avgDaysToDeliver === null ? '—' : String(current.avgDaysToDeliver)}
        unit={current.avgDaysToDeliver === null ? undefined : 'days'}
        caption={current.avgDaysToDeliver === null ? 'No deliveries yet' : 'request to door'}
        delta={current.avgDaysToDeliver !== null && previous?.avgDaysToDeliver != null ? <Delta now={current.avgDaysToDeliver} before={previous.avgDaysToDeliver} lowerIsBetter /> : null}
        tone="bg-amber-500/15"
      />
    </div>
  )
}
