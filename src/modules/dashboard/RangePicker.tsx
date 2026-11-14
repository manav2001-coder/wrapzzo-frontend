import type { DashboardRange } from '@/api/dashboard'
import { cn } from '@/lib/utils'

const OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

export const RANGE_PHRASE: Record<DashboardRange, string> = {
  '7d': 'the 7 days before',
  '30d': 'the 30 days before',
  '90d': 'the 90 days before',
  year: 'last year',
  all: '',
}

/** Period pills. They scroll sideways on a narrow phone rather than wrapping, and each is a 44px tap target. */
export function RangePicker({ value, onChange }: { value: DashboardRange; onChange: (range: DashboardRange) => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
            value === o.value ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
