import { ChevronRight, Stethoscope } from 'lucide-react'

import { ProgressRing } from './ProgressRing'

/**
 * How many of the doctors on a list have had a PEL requested in the period -- the headline for a field person, whose job is to
 * cover their doctors. The button opens the ones still waiting.
 */
export function CoverageCard({ assigned, covered, personal, onSeeLeft }: { assigned: number; covered: number; personal: boolean; onSeeLeft: () => void }) {
  if (assigned === 0) {
    return (
      <section className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Stethoscope className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{personal ? 'Your doctors' : 'Doctor coverage'}</h2>
          <p className="text-sm text-muted-foreground">{personal ? 'Doctors you add show up here, with who has had a PEL.' : 'No doctors are assigned to your team yet.'}</p>
        </div>
      </section>
    )
  }
  const left = assigned - covered
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <ProgressRing percent={(covered / assigned) * 100} size={84} stroke={8} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{personal ? 'Your doctors' : 'Doctor coverage'}</h2>
          <p className="mt-1 text-2xl leading-tight font-bold tabular-nums">
            {covered.toLocaleString('en-IN')} <span className="text-base font-medium text-muted-foreground">of {assigned.toLocaleString('en-IN')} covered</span>
          </p>
          <p className="text-xs text-muted-foreground">had a PEL requested in this period</p>
        </div>
      </div>
      {personal && left > 0 && (
        <button
          type="button"
          onClick={onSeeLeft}
          className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border bg-background/50 px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <span>
            See the {left.toLocaleString('en-IN')} {left === 1 ? 'doctor' : 'doctors'} still waiting
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {personal && left === 0 && <p className="mt-3 text-sm font-medium text-success">Every doctor on your list is covered. Nice work.</p>}
    </section>
  )
}
