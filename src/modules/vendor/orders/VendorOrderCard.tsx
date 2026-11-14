import { ChevronRight, Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { VendorOrder } from '@/api/vendorOrders'
import { formatDate } from '@/lib/datetime'
import { doctorLabel } from '@/lib/doctor-label'
import type { VendorStage } from '@/lib/vendor-order-stage'
import { cn } from '@/lib/utils'
import { VendorStageBadge } from './VendorStageBadge'

/** The colour of the strip down a card's left edge: what the order needs, at a glance down a long list. */
const ACCENT: Record<VendorStage, string> = {
  rework: 'bg-destructive',
  artwork: 'bg-warning',
  review: 'bg-primary/50',
  ready: 'bg-success',
  dispatched: 'bg-sky-500',
  cancelled: 'bg-muted-foreground/40',
}

/**
 * One order on a phone: a compact card that is a single tap target. The order number and what it needs next come first, then what to make
 * and how many, for whom, and from which company. It replaces the generic card (every column as a label and a value), which ran to
 * three screens for ten orders.
 */
export function VendorOrderCard({ order }: { order: VendorOrder & { stage: VendorStage } }) {
  const { t } = useTranslation('vendor')
  const note = order.stage === 'rework' && order.latestDesignComment
  return (
    <Link
      to={`/vendor/orders/${order.id}`}
      aria-label={`${t('orders.open')} ${order.displayId}`}
      className="relative block overflow-hidden rounded-xl border bg-card py-3 pr-3 pl-4 transition-colors active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', ACCENT[order.stage])} />
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-primary">{order.displayId}</p>
        <VendorStageBadge stage={order.stage} />
      </div>
      <p className="mt-1 text-[15px] font-medium">
        {order.giftName ?? '—'}
        <span className="text-muted-foreground"> × </span>
        <span className="tabular-nums">{order.quantity}</span>
      </p>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">{doctorLabel(order.recipientName, order.recipientPcode)}</p>
      {note && <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">“{order.latestDesignComment}”</p>}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{order.companyName}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{formatDate(order.assignedAt ?? order.createdAt)}</span>
          {order.designVersions > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <Palette className="h-3 w-3" />v{order.designVersions}
              </span>
            </>
          )}
        </p>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </div>
    </Link>
  )
}
