import { ArrowRight, PackageCheck, Stethoscope } from 'lucide-react'
import type { ComponentType } from 'react'

type PelDrilldown = 'pelsRequested' | 'pelsServed'

function Stat({
  icon: Icon,
  label,
  value,
  caption,
  clickable,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  caption: string
  clickable: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`relative flex w-full flex-col gap-3 text-left ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
        </div>
        {clickable && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            View details <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <div>
        <p className={`text-4xl font-bold tracking-tight sm:text-5xl ${clickable ? 'text-foreground' : 'text-foreground/25'}`}>{value}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{caption}</p>
      </div>
    </button>
  )
}

const count = (n: number) => n.toLocaleString('en-IN')

/** The two numbers the dashboard leads with: PELs requested per doctor, and the total PELs served. Quantities only --
 * no prices or revenue anywhere on the dashboard. Each opens a per-doctor breakdown in the shared drilldown dialog. */
export function PelStatsCard({
  requested,
  doctors,
  served,
  onSelect,
}: {
  requested: number
  doctors: number
  served: number
  onSelect: (dimension: PelDrilldown) => void
}) {
  const perDoctor = doctors > 0 ? Math.round((requested / doctors) * 10) / 10 : 0

  return (
    <div className="relative flex h-full w-full flex-col justify-between gap-6 overflow-hidden rounded-lg border bg-card p-6">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
      />
      <Stat
        icon={Stethoscope}
        label="PELs requested per doctor"
        value={count(perDoctor)}
        caption={doctors > 0 ? `${count(requested)} PELs requested across ${count(doctors)} ${doctors === 1 ? 'doctor' : 'doctors'}.` : 'No PELs requested yet.'}
        clickable={doctors > 0}
        onClick={() => onSelect('pelsRequested')}
      />
      <div className="border-t" />
      <Stat
        icon={PackageCheck}
        label="Total PELs served"
        value={count(served)}
        caption={served > 0 ? 'PELs on orders delivered to doctors.' : 'Delivered PELs appear here.'}
        clickable={served > 0}
        onClick={() => onSelect('pelsServed')}
      />
    </div>
  )
}
