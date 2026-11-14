import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

export interface ScrollTab {
  value: string
  label: string
  badge?: number
}

/**
 * Tabs for a phone: one row of pills that scrolls sideways, the picked one filled and kept in view. Plain underlined tabs run off the
 * edge of a phone and cut a label in half; pills read as a row you can swipe, with the counts beside each name.
 * The roles are the tab pattern's own (tablist, tab, aria-selected), so it is as accessible as the desktop tabs it stands in for.
 */
export function ScrollTabs({ tabs, value, onValueChange, className }: { tabs: ScrollTab[]; value: string; onValueChange: (value: string) => void; className?: string }) {
  const picked = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    // Bring the picked pill into view (a link from the home screen can open on one past the edge).
    try {
      picked.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    } catch {
      /* scrollIntoView is not available everywhere */
    }
  }, [value])

  return (
    <div className={cn('-mx-4 sm:-mx-6', className)}>
      <div
        role="tablist"
        className="flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = tab.value === value
          return (
            <button
              key={tab.value}
              ref={active ? picked : undefined}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onValueChange(tab.value)}
              className={cn(
                'flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground active:bg-muted',
              )}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-primary-foreground/20' : 'bg-muted text-foreground')}>{tab.badge}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
