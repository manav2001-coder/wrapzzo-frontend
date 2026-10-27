import { Check, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { OrderStatus, StageEvent } from '@/api/orders'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { formatDate, formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'

/** The fulfilment pipeline in order. CANCELLED is a terminal state off to the side, not a step. */
const ORDER_STAGES: OrderStatus[] = ['PROCESSING', 'PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED']

/** An order routed through the company's warehouse: the vendor ships to it, and it delivers onward. */
const WAREHOUSE_ORDER_STAGES: OrderStatus[] = [
  'PROCESSING',
  'PRODUCTION_QUEUE',
  'DISPATCHED',
  'RECEIVED_AT_WAREHOUSE',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

const WAREHOUSE_ONLY: OrderStatus[] = ['RECEIVED_AT_WAREHOUSE', 'OUT_FOR_DELIVERY']

/**
 * viaWarehouse when the caller knows it (the order's warehouseName); otherwise read off the
 * order's own progress, for lists that don't carry it (the dashboard timeline).
 */
function stagesFor(status: OrderStatus, history: StageEvent[] = [], viaWarehouse?: boolean): OrderStatus[] {
  const routed = viaWarehouse ?? (WAREHOUSE_ONLY.includes(status) || history.some((event) => WAREHOUSE_ONLY.includes(event.status)))
  return routed ? WAREHOUSE_ORDER_STAGES : ORDER_STAGES
}

const VARIANT: Record<OrderStatus, BadgeProps['variant']> = {
  PROCESSING: 'secondary',
  PRODUCTION_QUEUE: 'warning',
  DISPATCHED: 'default',
  RECEIVED_AT_WAREHOUSE: 'default',
  OUT_FOR_DELIVERY: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation('orders')
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {t(`status.${status}`)}
    </Badge>
  )
}

/**
 * Every stage up to the order's current one, dated from its real history entry; a stage not
 * reached yet shows no date. A cancelled order shows a terminal marker instead of a position.
 */
export function OrderStepper({
  status,
  history,
  viaWarehouse,
}: {
  status: OrderStatus
  history: StageEvent[]
  viaWarehouse?: boolean
}) {
  const { t } = useTranslation('orders')
  if (status === 'CANCELLED') {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
        <XCircle className="h-4 w-4" />
        {t('status.CANCELLED')}
      </p>
    )
  }
  const reachedAt = new Map(history.map((event) => [event.status, event.at]))
  const stages = stagesFor(status, history, viaWarehouse)
  const current = stages.indexOf(status)
  return (
    <ol className="flex items-start">
      {stages.map((stage, index) => {
        const done = index < current
        const active = index === current
        const at = reachedAt.get(stage)
        return (
          <li key={stage} className="flex flex-1 items-start last:flex-none">
            <div className="flex w-20 flex-col items-center gap-1.5 text-center">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-xs font-semibold',
                  done || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  active && 'ring-4 ring-primary/20',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className={cn('text-[11px] font-medium', !(done || active) && 'text-muted-foreground')}>
                {t(`status.${stage}`)}
              </span>
              <span className="text-[10px] text-muted-foreground">{at ? formatDate(at) : '-'}</span>
            </div>
            {index < stages.length - 1 && (
              <span className={cn('mt-4 h-0.5 flex-1', done ? 'bg-primary' : 'bg-border')} aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** A thin bar with one segment per stage, filled up to the current one -- all red when cancelled. For compact cards. */
export function OrderProgressBar({ status, history }: { status: OrderStatus; history?: StageEvent[] }) {
  const stages = stagesFor(status, history)
  const current = stages.indexOf(status)
  return (
    <div className="flex gap-1" aria-hidden>
      {stages.map((stage, index) => (
        <span
          key={stage}
          className={cn(
            'h-1 flex-1 rounded-full',
            status === 'CANCELLED' ? 'bg-destructive/40' : index <= current ? 'bg-success' : 'bg-border',
          )}
        />
      ))}
    </div>
  )
}

/** "status — when — by whom", oldest first: the detail behind the stepper's dates. */
export function OrderHistoryList({ history }: { history: StageEvent[] }) {
  const { t } = useTranslation('orders')
  if (history.length === 0) return <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
  return (
    <ul className="space-y-1.5">
      {history.map((event, index) => (
        <li key={index} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs">
          <span className="font-medium">{t(`status.${event.status}`)}</span>
          <span className="text-muted-foreground">
            {formatDateTime(event.at)}
            {event.changedByName && ` · ${event.changedByName}`}
          </span>
        </li>
      ))}
    </ul>
  )
}
