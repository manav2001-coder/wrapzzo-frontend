interface Stage {
  label: string
  value: number
  icon: string
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
  onSelectStage: () => void
}) {
  const stages: Stage[] = [
    { label: 'In progress', value: inProgress, icon: 'pi-cog', colorClass: 'from-amber-500/15 to-amber-500/5 text-amber-500' },
    { label: 'Dispatched', value: dispatched, icon: 'pi-send', colorClass: 'from-sky-500/15 to-sky-500/5 text-sky-500' },
    { label: 'Delivered', value: delivered, icon: 'pi-check-circle', colorClass: 'from-emerald-500/15 to-emerald-500/5 text-emerald-500' },
  ]

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center gap-2 text-text-muted">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
          <i className="pi pi-arrow-right-arrow-left text-sm" />
        </div>
        <span className="text-xs font-semibold tracking-wide uppercase">Fulfillment pipeline</span>
      </div>

      <div className="flex flex-1 items-center">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={onSelectStage}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-none bg-transparent p-2 text-center transition-transform hover:-translate-y-0.5"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${stage.colorClass}`}>
                <i className={`pi ${stage.icon} text-xl`} />
              </div>
              <span className="text-2xl leading-none font-bold tracking-tight text-text">{stage.value}</span>
              <span className="text-xs font-medium text-text-muted">{stage.label}</span>
            </button>
            {i < stages.length - 1 && <i className="pi pi-angle-right mx-1 shrink-0 text-lg text-border" />}
          </div>
        ))}
      </div>
    </div>
  )
}
