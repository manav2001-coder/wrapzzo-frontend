import { CheckCircle2, Cog, Send, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type PipelineStage = 'inProgress' | 'dispatched' | 'delivered'

interface Stage {
  key: PipelineStage
  label: string
  value: number
  icon: LucideIcon
  bar: string
  chip: string
}

/** Where every order stands, In progress -> Dispatched -> Delivered: one bar sized by how many orders sit in each
 * stage, with a tile under it per stage. Each stage opens the orders in it. */
export function PipelineFlow({
  inProgress,
  dispatched,
  delivered,
  onSelectStage,
}: {
  inProgress: number
  dispatched: number
  delivered: number
  onSelectStage: (stage: PipelineStage) => void
}) {
  const stages: Stage[] = [
    { key: 'inProgress', label: 'In progress', value: inProgress, icon: Cog, bar: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    { key: 'dispatched', label: 'Dispatched', value: dispatched, icon: Send, bar: 'bg-sky-400', chip: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    { key: 'delivered', label: 'Delivered', value: delivered, icon: CheckCircle2, bar: 'bg-emerald-500', chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  ]
  const total = inProgress + dispatched + delivered

  return (
    <section className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Order pipeline</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{total.toLocaleString('en-IN')} orders</span>
      </div>

      <div className="mt-4 flex h-3 w-full gap-1 overflow-hidden rounded-full bg-muted" role="img" aria-label="Orders by stage">
        {total > 0 &&
          stages.map((s) =>
            s.value > 0 ? <div key={s.key} className={cn('h-full rounded-full transition-all duration-700', s.bar)} style={{ flexGrow: s.value }} /> : null,
          )}
      </div>

      <div className="mt-5 grid flex-1 grid-cols-3 gap-3">
        {stages.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelectStage(s.key)}
            className="flex flex-col items-start gap-2 rounded-xl border bg-background/50 p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <span className={cn('grid h-8 w-8 place-items-center rounded-lg', s.chip)}>
              <s.icon className="h-4 w-4" />
            </span>
            <span className="text-2xl leading-none font-bold tabular-nums">{s.value}</span>
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
