export function StatCard({
  label,
  value,
  icon,
  accent = 'accent',
}: {
  label: string
  value: string | number
  icon: string
  accent?: 'accent' | 'success' | 'warning' | 'danger'
}) {
  const accentClass = {
    accent: 'bg-accent/10 text-accent',
    success: 'bg-emerald-500/10 text-emerald-500',
    warning: 'bg-amber-500/10 text-amber-500',
    danger: 'bg-red-500/10 text-red-500',
  }[accent]

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accentClass}`}>
        <i className={`pi ${icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold tracking-tight text-text">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </div>
  )
}
