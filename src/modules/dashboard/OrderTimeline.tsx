import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from 'primereact/dialog'
import type { OrderTimelineItem } from '@/api/dashboard'
import { EmptyState } from '@/components/EmptyState'
import { GiftThumb, OrderProgressBar, OrderStepper, StageHistoryList } from '@/components/OrderFulfillmentStepper'
import { StatusBadge } from '@/components/StatusBadge'
import { humanize } from '@/lib/format'

const SOURCE_LABELS: Record<string, string> = { CAMPAIGN: 'Campaign', QUICK_GIFT: 'Quick Gift', BULK_GIFT: 'Bulk Gifting' }

function OrderDetailDialog({ order, onHide }: { order: OrderTimelineItem | null; onHide: () => void }) {
  return (
    <Dialog
      header={order?.giftName}
      visible={order !== null}
      onHide={onHide}
      style={{ width: '30rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      modal
    >
      {order && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <GiftThumb url={order.giftImageUrl} size="h-14 w-14" />
            <div className="min-w-0">
              <p className="text-sm text-text-muted">
                {order.displayId} · {SOURCE_LABELS[order.source] ?? order.source}
              </p>
              <p className="text-sm font-medium text-text">{order.recipientName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Requested by {order.requesterName}</span>
            <StatusBadge status={order.status} label={humanize(order.status)} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border p-3">
            <OrderStepper status={order.status} history={order.history} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">Full history</p>
            <StageHistoryList history={order.history} />
          </div>
        </div>
      )}
    </Dialog>
  )
}

/**
 * A horizontal-scroll strip of compact gift cards -- Company Admin sees every order in the
 * company, a Member sees just their own (same scoping as the rest of the Dashboard). Never
 * dumps every order onto the page at once: only a handful of chips are shown, "View all"
 * is always the last chip in the strip, and a chip's own full stage-by-stage history only
 * opens on click.
 */
export function OrderTimeline({ orders }: { orders: OrderTimelineItem[] }) {
  const [selected, setSelected] = useState<OrderTimelineItem | null>(null)

  if (orders.length === 0) {
    return (
      <EmptyState
        icon="pi-truck"
        title="No orders yet"
        description="Once a gift is approved, its journey from processing to delivery shows up here."
      />
    )
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => setSelected(order)}
            className="flex w-[160px] shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
          >
            <div className="flex items-center gap-2">
              <GiftThumb url={order.giftImageUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-text">{order.giftName}</p>
                <p className="truncate text-[11px] text-text-muted">{order.recipientName}</p>
              </div>
            </div>
            <OrderProgressBar status={order.status} />
            <p className="text-[10px] font-medium text-text-muted">
              {order.status === 'CANCELLED' ? 'Cancelled' : humanize(order.status)}
            </p>
          </button>
        ))}

        <Link
          to="/orders"
          className="flex w-[160px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-transparent p-3 text-center text-accent transition-colors hover:bg-surface-muted"
        >
          <i className="pi pi-arrow-right text-lg" />
          <span className="text-xs font-medium">View all orders</span>
        </Link>
      </div>

      <OrderDetailDialog order={selected} onHide={() => setSelected(null)} />
    </div>
  )
}
