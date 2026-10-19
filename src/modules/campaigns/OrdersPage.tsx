import { Accordion, AccordionTab } from 'primereact/accordion'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useMemo, useState } from 'react'
import type { Order } from '@/api/orders'
import { EmptyState } from '@/components/EmptyState'
import { GiftThumb, OrderProgressBar, OrderStepper, StageHistoryList } from '@/components/OrderFulfillmentStepper'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import { useApproveOrderDesign, useOrderDesigns, useRejectOrderDesign } from '@/hooks/useOrderDesigns'
import { useOrders, useRequestOrderPhotoLink } from '@/hooks/useOrders'
import { useHasPermission } from '@/hooks/usePermissions'
import { formatCurrency, humanize } from '@/lib/format'
import { groupByCampaign } from '@/lib/groupByCampaign'
import { showApiError, showToast } from '@/lib/toast'

/** PEL process steps 5-6 (Design &amp; QC, Review &amp; rework) -- only shown to a reviewer holding order.design.review. */
function DesignReviewSection({ orderId }: { orderId: string }) {
  const { data: designs, isLoading } = useOrderDesigns(orderId)
  const approve = useApproveOrderDesign(orderId)
  const reject = useRejectOrderDesign(orderId)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  async function handleApprove(designId: string) {
    try {
      await approve.mutateAsync(designId)
      showToast({ severity: 'success', summary: 'Design approved' })
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleReject() {
    if (!rejectingId || !comment.trim()) return
    try {
      await reject.mutateAsync({ designId: rejectingId, comment: comment.trim() })
      showToast({ severity: 'success', summary: 'Sent back for rework' })
      setRejectingId(null)
      setComment('')
    } catch (error) {
      showApiError(error)
    }
  }

  if (isLoading) return null
  if (!designs || designs.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">Design review</p>
        <p className="text-sm text-text-muted">No artwork proof uploaded by the vendor yet.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">Design review</p>
      <div className="flex flex-col gap-3">
        {designs.map((design) => (
          <div key={design.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text">Version {design.versionNo}</p>
                <p className="text-xs text-text-muted">by {design.uploadedByVendorName}</p>
              </div>
              <StatusBadge status={design.status} label={humanize(design.status)} />
            </div>
            <a href={design.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent hover:underline">
              View file{design.fileName ? ` (${design.fileName})` : ''}
            </a>
            {design.status === 'REJECTED' && design.reviewComment && (
              <p className="mt-2 text-xs text-text-muted">
                <span className="font-medium text-text">Rework requested:</span> {design.reviewComment}
              </p>
            )}
            {design.status === 'PENDING_REVIEW' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button label="Approve" icon="pi pi-check" size="small" loading={approve.isPending} onClick={() => handleApprove(design.id)} />
                <Button
                  label="Send back for rework"
                  icon="pi pi-undo"
                  size="small"
                  outlined
                  severity="danger"
                  onClick={() => setRejectingId(design.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog header="Send back for rework" visible={rejectingId !== null} onHide={() => setRejectingId(null)} style={{ width: '28rem' }} modal>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">Tell the vendor what needs to change -- they'll see this and upload the next version.</p>
          <InputTextarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoResize placeholder="E.g. logo too small, wrong color..." />
          <Button label="Send" icon="pi pi-send" loading={reject.isPending} disabled={!comment.trim()} onClick={handleReject} />
        </div>
      </Dialog>
    </div>
  )
}

function CampaignAccordionHeader({ campaignName, orders }: { campaignName: string; orders: Order[] }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    orders.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1))
    return counts
  }, [orders])

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 pr-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
          <i className="pi pi-megaphone text-sm" />
        </div>
        <span className="truncate font-semibold text-text">{campaignName}</span>
        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
          {orders.length} order{orders.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(statusCounts).map(([status, count]) => (
          <StatusBadge key={status} status={status} label={`${count} ${humanize(status)}`} />
        ))}
      </div>
    </div>
  )
}

/** Same compact chip look as the Dashboard's order timeline widget -- a click opens the
 * full detail (photo, "send link" action, and stage-by-stage timeline) in a dialog rather
 * than growing the card in place. */
function OrderChip({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="flex items-center gap-2">
        <GiftThumb url={order.giftImageUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-text">{order.giftName ?? order.displayId}</p>
          <p className="truncate text-[11px] text-text-muted">{order.recipientName ?? '—'}</p>
        </div>
      </div>
      <OrderProgressBar status={order.status} />
      <p className="text-[10px] font-medium text-text-muted">{order.status === 'CANCELLED' ? 'Cancelled' : humanize(order.status)}</p>
    </button>
  )
}

function OrderDetailDialog({
  order,
  onHide,
  onPhotoLinkSent,
}: {
  order: Order | null
  onHide: () => void
  onPhotoLinkSent: (order: Order, link: string) => void
}) {
  const requestPhotoLink = useRequestOrderPhotoLink()
  const canReviewDesign = useHasPermission('order.design.review')

  async function handleSendPhotoLink() {
    if (!order) return
    try {
      const result = await requestPhotoLink.mutateAsync(order.id)
      showToast({ severity: 'success', summary: 'Link sent to the recipient' })
      onPhotoLinkSent(order, result.recipientUploadUrl)
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <Dialog
      header={order?.giftName ?? order?.displayId}
      visible={order !== null}
      onHide={onHide}
      style={{ width: '32rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      modal
    >
      {order && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <GiftThumb url={order.giftImageUrl} size="h-14 w-14" />
            <div className="min-w-0">
              <p className="text-sm text-text-muted">
                {order.displayId} · {humanize(order.source)}
              </p>
              <p className="text-sm font-medium text-text">{order.recipientName ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">{formatCurrency(order.totalPrice)}</span>
            <StatusBadge status={order.status} label={humanize(order.status)} />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1.5 text-xs text-text-muted">Recipient's photo</p>
              {order.recipientPhotoUrl ? (
                <a href={order.recipientPhotoUrl} target="_blank" rel="noreferrer" className="inline-block">
                  <img src={order.recipientPhotoUrl} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
                </a>
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-border text-text-muted">
                  <i className="pi pi-image text-xl" />
                </div>
              )}
            </div>
            {!order.recipientPhotoUrl && (
              <Button
                label="Send link for image"
                icon="pi pi-send"
                outlined
                size="small"
                loading={requestPhotoLink.isPending}
                onClick={handleSendPhotoLink}
              />
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border p-3">
            <OrderStepper status={order.status} history={order.history} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">Full history</p>
            <StageHistoryList history={order.history} />
          </div>

          {canReviewDesign && <DesignReviewSection orderId={order.id} />}
        </div>
      )}
    </Dialog>
  )
}

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { PROCESSING: 0, PRODUCTION_QUEUE: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
    orders?.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1))
    return counts
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    const query = search.trim().toLowerCase()
    if (!query) return orders
    return orders.filter((order) =>
      [order.displayId, order.giftName, order.recipientName, order.campaignName, humanize(order.source), humanize(order.status)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    )
  }, [orders, search])

  const groups = useMemo(() => groupByCampaign(filteredOrders), [filteredOrders])

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every order generated from Quick Gift, Bulk Gifting, or an approved Campaign submission." />

      {!isLoading && orders?.length === 0 ? (
        <EmptyState icon="pi-shopping-bag" title="No orders yet" description="Orders appear here once a submission is approved." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total orders" value={orders?.length ?? 0} icon="pi-shopping-bag" />
            <StatCard label="In production" value={statusCounts.PRODUCTION_QUEUE} icon="pi-cog" accent="warning" />
            <StatCard label="Dispatched" value={statusCounts.DISPATCHED} icon="pi-send" accent="warning" />
            <StatCard label="Delivered" value={statusCounts.DELIVERED} icon="pi-check-circle" accent="success" />
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
            <p className="mb-2 text-sm font-medium text-text">Orders by status</p>
            <StatusDonutChart counts={statusCounts} />
          </div>

          <div className="mb-4">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders"
                className="w-full sm:w-80"
              />
            </IconField>
          </div>

          {groups.length === 0 ? (
            <EmptyState icon="pi-search" title="No orders match" description="Try a different order id, gift, recipient, or campaign name." />
          ) : (
            <>
              <p className="mb-2 text-xs text-text-muted">Each row groups orders by campaign, or by Quick Gift for one-off requests.</p>
              <Accordion multiple className="campaign-accordion">
                {groups.map((group) => (
                  <AccordionTab key={group.campaignId} header={<CampaignAccordionHeader campaignName={group.campaignName} orders={group.items} />}>
                    <div className="flex flex-wrap gap-3">
                      {group.items.map((order) => (
                        <div key={order.id} className="w-[160px]">
                          <OrderChip order={order} onClick={() => setSelected(order)} />
                        </div>
                      ))}
                    </div>
                  </AccordionTab>
                ))}
              </Accordion>
            </>
          )}
        </>
      )}

      <OrderDetailDialog
        order={selected}
        onHide={() => setSelected(null)}
        onPhotoLinkSent={(o, link) => setPhotoLinkPrompt({ link, recipientName: o.recipientName, phone: o.recipientPhone })}
      />
      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
