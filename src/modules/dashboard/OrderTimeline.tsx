import { ArrowRight, Gift, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { OrderTimelineItem } from '@/api/dashboard'
import { AppDialog } from '@/components/app-dialog'
import { EmptyState } from '@/components/empty-state'
import { OrderHistoryList, OrderProgressBar, OrderStatusBadge, OrderStepper } from '@/components/orders/order-status'

function Thumb({ url, size = 40 }: { url: string | null; size?: number }) {
  return url ? (
    <img src={url} alt="" className="shrink-0 rounded-md border object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-md bg-primary/10 text-primary" style={{ width: size, height: size }}>
      <Gift className="h-4 w-4" />
    </span>
  )
}

/**
 * A horizontal strip of compact order cards -- company-wide for an admin, own orders for a
 * member (the dashboard's scoping). Only a handful show; "View all" ends the strip, and a
 * card's stage-by-stage history opens on click.
 */
export function OrderTimeline({ orders }: { orders: OrderTimelineItem[] }) {
  const { t } = useTranslation('orders')
  const [selected, setSelected] = useState<OrderTimelineItem | null>(null)

  if (orders.length === 0) {
    return <EmptyState icon={Truck} title="No orders yet" description="Once a gift is ordered, its journey to delivery shows up here." />
  }

  return (
    <div>
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {orders.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => setSelected(order)}
              className="flex w-full items-center gap-3 p-3.5 text-left transition-colors first:rounded-t-2xl hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Thumb url={order.giftImageUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{order.giftName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.recipientName} · {order.displayId}
                </p>
              </div>
              <div className="hidden w-40 shrink-0 sm:block">
                <OrderProgressBar status={order.status} />
              </div>
              <div className="shrink-0">
                <OrderStatusBadge status={order.status} />
              </div>
            </button>
          </li>
        ))}
        <li>
          <Link to="/orders" className="flex items-center justify-center gap-1.5 rounded-b-2xl p-3 text-sm font-medium text-primary transition-colors hover:bg-muted/60">
            View all orders
            <ArrowRight className="h-4 w-4" />
          </Link>
        </li>
      </ul>

      <AppDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        size="md"
        title={selected?.giftName ?? ''}
        cancelLabel={t('action.close', { ns: 'common' })}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Thumb url={selected.giftImageUrl} size={56} />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {selected.displayId} · {t(`source.${selected.source}`, { defaultValue: selected.source })}
                </p>
                <p className="text-sm font-medium">{selected.recipientName}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Requested by {selected.requesterName}</span>
              <OrderStatusBadge status={selected.status} />
            </div>
            <div className="overflow-x-auto rounded-md border p-3">
              <OrderStepper status={selected.status} history={selected.history} />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('detail.history')}</h4>
              <OrderHistoryList history={selected.history} />
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
