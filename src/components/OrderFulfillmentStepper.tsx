import { format } from 'date-fns'
import type { OrderStatus, StageEvent } from '@/api/orders'

export const STAGES: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'PROCESSING', label: 'Processing', icon: 'pi-cog' },
  { key: 'PRODUCTION_QUEUE', label: 'Production', icon: 'pi-box' },
  { key: 'DISPATCHED', label: 'Dispatched', icon: 'pi-send' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'pi-check-circle' },
]

export function GiftThumb({ url, size = 'h-10 w-10' }: { url: string | null; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-lg object-cover`} />
  ) : (
    <div className={`grid ${size} shrink-0 place-items-center rounded-lg bg-surface-muted text-text-muted`}>
      <i className="pi pi-gift" />
    </div>
  )
}

/** A thin 4-segment bar, one per pipeline stage -- fills up to the current stage, all red if cancelled. */
export function OrderProgressBar({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex gap-1">
        {STAGES.map((s) => (
          <div key={s.key} className="h-1 flex-1 rounded-full bg-red-500/40" />
        ))}
      </div>
    )
  }
  const currentIndex = STAGES.findIndex((s) => s.key === status)
  return (
    <div className="flex gap-1">
      {STAGES.map((s, i) => (
        <div key={s.key} className={`h-1 flex-1 rounded-full ${i <= currentIndex ? 'bg-emerald-500' : 'bg-border'}`} />
      ))}
    </div>
  )
}

/**
 * Every stage up to the order's current one, dated from its real history entry -- not a
 * reconstructed guess. There's no per-stage history for a stage the order hasn't reached
 * yet, so those just show their label with no date. CANCELLED is a distinct terminal badge
 * instead of a stepper position, since it doesn't map onto the Processing -> Delivered
 * sequence at any one point. Numbered circles (not icons) with a soft halo on the current
 * step and a full-width connecting line -- a plain, legible wizard-step look.
 */
export function OrderStepper({ status, history }: { status: OrderStatus; history: StageEvent[] }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
        <i className="pi pi-times-circle text-sm" />
        <span className="text-xs font-medium">Cancelled</span>
      </div>
    )
  }
  const atByStatus = new Map(history.map((h) => [h.status, h.at]))
  const currentIndex = STAGES.findIndex((s) => s.key === status)
  return (
    <div className="flex items-start">
      {STAGES.map((stage, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        const at = atByStatus.get(stage.key)
        return (
          <div key={stage.key} className="flex flex-1 items-start last:flex-none">
            <div className="flex w-16 flex-col items-center gap-1.5 text-center sm:w-20">
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-shadow ${
                  isCurrent
                    ? 'bg-accent text-white ring-4 ring-accent/20'
                    : isComplete
                      ? 'bg-accent text-white'
                      : 'bg-surface-muted text-text-muted'
                }`}
              >
                {isComplete ? <i className="pi pi-check text-[13px]" /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${isComplete || isCurrent ? 'text-text' : 'text-text-muted'}`}>
                {stage.label}
              </span>
              <span className="text-[9px] whitespace-nowrap text-text-muted">{at ? format(new Date(at), 'dd MMM') : '—'}</span>
            </div>
            {i < STAGES.length - 1 && <div className={`mt-4.5 h-0.5 flex-1 ${i < currentIndex ? 'bg-accent' : 'bg-border'}`} />}
          </div>
        )
      })}
    </div>
  )
}

/** The full "status — date — by whom" list, oldest first -- the detail behind the stepper's dates. */
export function StageHistoryList({ history }: { history: StageEvent[] }) {
  if (history.length === 0) {
    return <p className="text-xs text-text-muted">No history recorded yet.</p>
  }
  return (
    <div className="flex flex-col gap-1.5">
      {history.map((h, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs">
          <span className="font-medium text-text">{h.status.replace('_', ' ')}</span>
          <span className="text-text-muted">
            {format(new Date(h.at), 'dd MMM yyyy, h:mm a')}
            {h.changedByName && ` · ${h.changedByName}`}
          </span>
        </div>
      ))}
    </div>
  )
}
