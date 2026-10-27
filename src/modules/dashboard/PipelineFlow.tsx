import { ArrowLeftRight, CheckCircle2, ChevronRight, Cog, Send, type LucideIcon } from 'lucide-react'

export type PipelineStage = 'inProgress' | 'dispatched' | 'delivered'

interface Stage {
  key: PipelineStage
  label: string
  value: number
  icon: LucideIcon
  colorClass: string
}

/** The order fulfillment pipeline (In progress -> Dispatched -> Delivered) as a connected flow, since that's
 * literally what these three numbers are -- a sequence, not three unrelated stats. */
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
    { key: 'inProgress', label: 'In progress', value: inProgress, icon: Cog, colorClass: 'from-amber-500/15 to-amber-500/5 text-amber-500' },
    { key: 'dispatched', label: 'Dispatched', value: dispatched, icon: Send, colorClass: 'from-sky-500/15 to-sky-500/5 text-sky-500' },
    {
      key: 'delivered',
      label: 'Delivered',
      value: delivered,
      icon: CheckCircle2,
      colorClass: 'from-emerald-500/15 to-emerald-500/5 text-emerald-500',
    },
  ]

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-6">
      <div className="mb-5 flex items-center gap-2 text-muted-foreground">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <ArrowLeftRight className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold tracking-wide uppercase">Fulfillment pipeline</span>
      </div>

      <div className="flex flex-1 items-center">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onSelectStage(stage.key)}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-none bg-transparent p-2 text-center transition-transform hover:-translate-y-0.5"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br ${stage.colorClass}`}>
                <stage.icon className="h-6 w-6" />
              </div>
              <span className="text-2xl leading-none font-bold tracking-tight text-foreground">{stage.value}</span>
              <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
            </button>
            {i < stages.length - 1 && <ChevronRight className="mx-1 h-5 w-5 shrink-0 text-border" />}
          </div>
        ))}
      </div>
    </div>
  )
}
