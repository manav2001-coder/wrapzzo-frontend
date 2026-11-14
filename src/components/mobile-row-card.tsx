import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

export interface MobileRowCardProps {
  /** The first line: what the row is (an order number, a doctor's name). */
  title: ReactNode
  /** Beside the title: a status badge, or a row's action buttons. */
  trailing?: ReactNode
  /** Lines under the title, one per row; empty ones are left out. */
  lines?: ReactNode[]
  /** A small muted line at the bottom (who and when). */
  footer?: ReactNode
  /** A strip down the left edge: a colour that says what state the row is in, at a glance down a long list. */
  accent?: string
  /** A thumbnail to the left of everything else. */
  media?: ReactNode
  /** Makes the whole card one tap target: a link... */
  to?: string
  /** ...or a button. Without either the card is plain, for rows whose own buttons are inside (edit, remove). */
  onClick?: () => void
  label?: string
  className?: string
}

/**
 * One row of a list on a phone: a compact card, not a stack of label-and-value pairs. Every list screen builds its card from this, so
 * they look and behave alike: a title and a state at the top, a few short lines, a small footer, and one tap target for the whole card.
 */
export function MobileRowCard({ title, trailing, lines, footer, accent, media, to, onClick, label, className }: MobileRowCardProps) {
  const shown = (lines ?? []).filter((line) => line !== null && line !== undefined && line !== false && line !== '')
  const interactive = Boolean(to || onClick)
  const body = (
    <>
      {accent && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', accent)} />}
      <div className="flex items-start gap-3">
        {media && <div className="shrink-0">{media}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-left font-semibold">{title}</div>
            {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
          </div>
          {shown.map((line, index) => (
            <div key={index} className="mt-0.5 min-w-0 text-left text-sm text-muted-foreground first:mt-1">
              {line}
            </div>
          ))}
          {(footer || interactive) && (
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="min-w-0 text-left">{footer}</div>
              {interactive && <ChevronRight aria-hidden className="h-4 w-4 shrink-0" />}
            </div>
          )}
        </div>
      </div>
    </>
  )
  const classes = cn(
    'relative block w-full overflow-hidden rounded-xl border bg-card py-3 pr-3 text-left',
    accent ? 'pl-4' : 'pl-3.5',
    interactive && 'transition-colors active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
    className,
  )
  if (to) {
    return (
      <Link to={to} aria-label={label} className={classes}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" aria-label={label} onClick={onClick} className={classes}>
        {body}
      </button>
    )
  }
  return <div className={classes}>{body}</div>
}
