import { Gift, Link2, Loader2 } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'

import type { Order } from '@/api/orders'
import { OrderHistoryList, OrderStatusBadge, OrderStepper } from '@/components/orders/order-status'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/datetime'
import { formatCurrency } from '@/lib/format'

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{children || '-'}</dd>
    </div>
  )
}

/**
 * One order's full picture in a side sheet: who it is for, where it stands in fulfilment and how it
 * got there, and the recipient's photo (or a way to ask for it). `actions` slots in what the caller
 * can do on top -- assigning a vendor on the platform side, reviewing artwork on the company side.
 */
export function OrderDetailSheet({
  order,
  onClose,
  onRequestPhotoLink,
  requestingPhotoLink,
  actions,
}: {
  order: Order | null
  onClose: () => void
  onRequestPhotoLink?: (order: Order) => void
  requestingPhotoLink?: boolean
  actions?: React.ReactNode
}) {
  const { t } = useTranslation('orders')
  return (
    <Sheet open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {order && (
          <>
            <SheetHeader className="border-b px-6 py-4 pr-10 text-left">
              <div className="flex items-center gap-3">
                {order.giftImageUrl ? (
                  <img src={order.giftImageUrl} alt="" className="h-11 w-11 rounded-md border object-cover" />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <Gift className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <SheetTitle className="truncate">{order.giftName ?? t('detail.title', { id: order.displayId })}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    {order.displayId}
                    <OrderStatusBadge status={order.status} />
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <dl className="grid grid-cols-2 gap-4">
                <Detail label={t('detail.recipient')}>{order.recipientName}</Detail>
                <Detail label={t('detail.phone')}>{order.recipientPhone}</Detail>
                <Detail label={t('detail.company')}>{order.companyName}</Detail>
                <Detail label={t('detail.source')}>{order.campaignName ?? t(`source.${order.source}`)}</Detail>
                <Detail label={t('detail.vendor')}>{order.assignedVendorName ?? t('unassigned')}</Detail>
                <Detail label={t('detail.quantity')}>{order.quantity}</Detail>
                <Detail label={t('detail.total')}>{formatCurrency(order.totalPrice)}</Detail>
                {order.orgUnitName && <Detail label={t('detail.orgUnit')}>{order.orgUnitName}</Detail>}
                <Detail label={t('detail.placed')}>{formatDateTime(order.createdAt)}</Detail>
              </dl>

              {actions}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('detail.progress')}</h3>
                <OrderStepper status={order.status} history={order.history} />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('detail.photo')}</h3>
                {order.recipientPhotoUrl ? (
                  <img src={order.recipientPhotoUrl} alt="" className="max-h-64 rounded-md border object-contain" />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('detail.noPhoto')}</p>
                )}
                {onRequestPhotoLink && (
                  <Button variant="outline" size="sm" disabled={requestingPhotoLink} onClick={() => onRequestPhotoLink(order)}>
                    {requestingPhotoLink ? <Loader2 className="animate-spin" /> : <Link2 />}
                    {t('detail.sendLink')}
                  </Button>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('detail.history')}</h3>
                <OrderHistoryList history={order.history} />
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
