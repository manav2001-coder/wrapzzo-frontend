import { CheckCircle2, ChevronRight, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface AttentionItem {
  key: string
  icon: LucideIcon
  label: string
  hint: string
  count: number
  onClick: () => void
}

/**
 * What is waiting on the person looking at the dashboard, most urgent first, each a tap away from the place to
 * deal with it. When nothing is waiting it says so plainly -- being caught up is the good news.
 */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
  const waiting = items.filter((i) => i.count > 0)
  return (
    <section className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Needs your attention</h2>
      {waiting.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium">You&rsquo;re all caught up</p>
          <p className="text-xs text-muted-foreground">Nothing is waiting on you right now.</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-1 flex-col gap-2">
          {waiting.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center gap-3 rounded-xl border bg-background/50 p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning')}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                </span>
                <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-sm font-bold text-warning tabular-nums">{item.count}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
