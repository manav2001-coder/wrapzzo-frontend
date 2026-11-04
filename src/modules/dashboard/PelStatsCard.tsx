import { ArrowUpRight, FilePlus2, PackageCheck, Stethoscope } from 'lucide-react'
import type { ComponentType } from 'react'

import { cn } from '@/lib/utils'
import { ProgressRing } from './ProgressRing'

type PelDrilldown = 'pelsRequested' | 'pelsServed'

const count = (n: number) => n.toLocaleString('en-IN')
const doctorsLabel = (n: number) => `${count(n)} ${n === 1 ? 'doctor' : 'doctors'}`
const percentOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)

function Kpi({
  icon: Icon,
  label,
  value,
  caption,
  percent,
  tone,
  clickable,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  caption: string
  /** Shown as a ring when given -- how much of the whole this number is. */
  percent?: number
  tone: string
  clickable: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={cn(
        'group relative flex min-h-[150px] w-full flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-sm transition-all',
        clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none' : 'cursor-default',
      )}
    >
      <div className={cn('pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full opacity-60 blur-2xl', tone)} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <span className={cn('grid h-8 w-8 place-items-center rounded-xl text-primary', tone)}>
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </span>
        {clickable && <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
        </div>
        {percent !== undefined && <ProgressRing percent={percent} />}
      </div>
    </button>
  )
}

/**
 * The three numbers the dashboard leads with: PELs created, PELs served and the doctors served -- counts only, no
 * prices. The two "served" cards show what share of what was created has been delivered; each opens a per-doctor
 * breakdown in the shared drilldown dialog.
 */
export function PelStatsCard({
  requested,
  doctors,
  served,
  doctorsServed,
  onSelect,
}: {
  requested: number
  doctors: number
  served: number
  doctorsServed: number
  onSelect: (dimension: PelDrilldown) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Kpi
        icon={FilePlus2}
        label="PELs created"
        value={count(requested)}
        caption={doctors > 0 ? `For ${doctorsLabel(doctors)}` : 'No PELs created yet.'}
        tone="bg-primary/10"
        clickable={doctors > 0}
        onClick={() => onSelect('pelsRequested')}
      />
      <Kpi
        icon={PackageCheck}
        label="PELs served"
        value={count(served)}
        caption={served > 0 ? 'Delivered to doctors' : 'Delivered PELs appear here.'}
        percent={requested > 0 ? percentOf(served, requested) : undefined}
        tone="bg-success/15"
        clickable={served > 0}
        onClick={() => onSelect('pelsServed')}
      />
      <Kpi
        icon={Stethoscope}
        label="Doctors served"
        value={count(doctorsServed)}
        caption={doctorsServed > 0 ? `of ${doctorsLabel(doctors)} requested for` : 'Appear once a PEL is delivered.'}
        percent={doctors > 0 ? percentOf(doctorsServed, doctors) : undefined}
        tone="bg-sky-500/15"
        clickable={doctorsServed > 0}
        onClick={() => onSelect('pelsServed')}
      />
    </div>
  )
}
