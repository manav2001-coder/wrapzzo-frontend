export function StatCard({
  label,
  value,
  icon,
  accent = 'accent',
  urgent = false,
}: {
  label: string
  value: string | number
  icon: string
  accent?: 'accent' | 'success' | 'warning' | 'danger'
  /** Highlights the card (ring + pulsing dot) when there's something waiting on the viewer -- e.g. a pending-count > 0. */
  urgent?: boolean
}) {
  const accentClass = {
    accent: 'from-accent/15 to-accent/5 text-accent',
    success: 'from-emerald-500/15 to-emerald-500/5 text-emerald-500',
    warning: 'from-amber-500/15 to-amber-500/5 text-amber-500',
    danger: 'from-red-500/15 to-red-500/5 text-red-500',
  }[accent]

  return (
    <div
      className={`group relative flex items-center gap-3.5 overflow-hidden rounded-xl border bg-surface p-4 transition-all ${
        urgent ? 'border-red-500/30 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]' : 'border-border'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${accentClass}`}>
        <i className={`pi ${icon} text-lg`} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-2xl leading-none font-bold tracking-tight text-text">
          {value}
          {urgent && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-text-muted">{label}</p>
      </div>
    </div>
  )
}
