import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { IconField } from 'primereact/iconfield'
import { Image } from 'primereact/image'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Sidebar } from 'primereact/sidebar'
import { TabPanel, TabView } from 'primereact/tabview'
import { useMemo, useState } from 'react'
import type { Order, OrderStatus } from '@/api/orders'
import type { OrderDesign } from '@/api/orderDesigns'
import { EmptyState } from '@/components/EmptyState'
import { GiftThumb, OrderStepper, StageHistoryList } from '@/components/OrderFulfillmentStepper'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import { useApproveOrderDesign, useOrderDesigns, useRejectOrderDesign } from '@/hooks/useOrderDesigns'
import { useOrders, useRequestOrderPhotoLink } from '@/hooks/useOrders'
import { useHasPermission } from '@/hooks/usePermissions'
import { formatCurrency, humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

const STATUS_OPTIONS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'In production', value: 'PRODUCTION_QUEUE' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

/** One artwork version in the review timeline -- a connected dot/line node, same visual language as OrderStepper. */
function DesignVersionNode({
  design,
  isLast,
  canAct,
  onApprove,
  onReject,
  approving,
}: {
  design: OrderDesign
  isLast: boolean
  canAct: boolean
  onApprove: () => void
  onReject: () => void
  approving: boolean
}) {
  const dotStyle =
    design.status === 'APPROVED'
      ? 'border-emerald-500 bg-emerald-500 text-white'
      : design.status === 'REJECTED'
        ? 'border-red-400 bg-red-400 text-white'
        : 'border-accent bg-accent text-white';
  const dotIcon = design.status === 'APPROVED' ? 'pi-check' : design.status === 'REJECTED' ? 'pi-times' : 'pi-clock';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[11px] ${dotStyle}`}>
          <i className={`pi ${dotIcon}`} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border" />}
      </div>

      <div className={`mb-5 flex-1 rounded-2xl border p-3.5 ${
        design.status === 'PENDING_REVIEW'
          ? 'border-accent/40 bg-accent-soft/40 shadow-sm shadow-accent/10'
          : design.status === 'REJECTED'
            ? 'border-red-400/30 bg-red-400/[0.04]'
            : 'border-border bg-surface'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {design.fileUrl ? (
              <Image
                src={design.fileUrl}
                alt={design.fileName ?? `Version ${design.versionNo}`}
                width="56"
                preview
                imageClassName="h-14 w-14 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-dashed border-border text-text-muted">
                <i className="pi pi-image" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-text">Version {design.versionNo}</p>
              <p className="text-xs text-text-muted">{design.uploadedByVendorName}</p>
            </div>
          </div>
          <StatusBadge status={design.status} label={humanize(design.status)} />
        </div>

        {design.status === 'REJECTED' && design.reviewComment && (
          <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/[0.06] px-3 py-2">
            <p className="text-xs font-semibold text-red-500 dark:text-red-400">Rework requested</p>
            <p className="mt-0.5 text-xs text-text-muted">{design.reviewComment}</p>
          </div>
        )}

        {design.status === 'APPROVED' && design.reviewedByUserName && (
          <p className="mt-2 text-[11px] text-text-muted">Approved by {design.reviewedByUserName}</p>
        )}

        {design.status === 'PENDING_REVIEW' && canAct && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button label="Approve" icon="pi pi-check" size="small" loading={approving} onClick={onApprove} />
            <Button label="Send back for rework" icon="pi pi-undo" size="small" outlined severity="danger" onClick={onReject} />
          </div>
        )}
      </div>
    </div>
  )
}

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

  const sorted = [...(designs ?? [])].sort((a, b) => b.versionNo - a.versionNo)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Artwork &amp; design review</p>
        {sorted.length > 0 && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted">
            {sorted.length} version{sorted.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <i className="pi pi-upload mb-1.5 text-lg text-text-muted" />
          <p className="text-sm text-text-muted">No artwork proof uploaded by the vendor yet.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((design, i) => (
            <DesignVersionNode
              key={design.id}
              design={design}
              isLast={i === sorted.length - 1}
              canAct
              approving={approve.isPending}
              onApprove={() => handleApprove(design.id)}
              onReject={() => setRejectingId(design.id)}
            />
          ))}
        </div>
      )}

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

function OrderDetailPanel({
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
    <Sidebar
      visible={order !== null}
      onHide={onHide}
      position="right"
      className="w-full sm:w-[28rem] md:w-[34rem]"
      pt={{ content: { className: 'p-0' } }}
    >
      {order && (
        <div className="flex h-full flex-col">
          <div className="border-b border-border bg-surface-muted/50 px-6 py-5">
            <div className="flex items-start gap-3.5">
              <GiftThumb url={order.giftImageUrl} size="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-muted">
                  {order.displayId} · {humanize(order.source)}
                </p>
                <h2 className="truncate text-lg font-semibold text-text">{order.giftName ?? order.displayId}</h2>
                <p className="truncate text-sm text-text-muted">{order.recipientName ?? '—'}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-text">{formatCurrency(order.totalPrice)}</span>
              <StatusBadge status={order.status} label={humanize(order.status)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {order.hasPendingDesignReview && canReviewDesign && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-accent/40 bg-accent-soft/60 px-4 py-3">
                <i className="pi pi-eye text-accent" />
                <p className="text-sm font-medium text-accent-ink">An artwork version is waiting on your review.</p>
              </div>
            )}

            <div className="mb-6 flex items-start justify-between gap-3">
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

            <div className="mb-6 overflow-x-auto rounded-xl border border-border p-3">
              <OrderStepper status={order.status} history={order.history} />
            </div>

            {canReviewDesign && (
              <div className="mb-6">
                <DesignReviewSection orderId={order.id} />
              </div>
            )}

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
                <i className="pi pi-chevron-right text-[10px] transition-transform group-open:rotate-90" />
                Full history
              </summary>
              <div className="mt-2">
                <StageHistoryList history={order.history} />
              </div>
            </details>
          </div>
        </div>
      )}
    </Sidebar>
  )
}

/** The main, scalable view: a proper paginated/sortable/filterable table -- cards don't hold up once a company has hundreds of orders. */
function OrdersTable({ orders, onOpen }: { orders: Order[]; onOpen: (order: Order) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(false)
  const canReviewDesign = useHasPermission('order.design.review')

  const needsReviewCount = useMemo(() => orders.filter((o) => o.hasPendingDesignReview).length, [orders])

  const filtered = useMemo(() => {
    let result = orders
    if (statusFilter !== 'ALL') result = result.filter((o) => o.status === statusFilter)
    if (onlyNeedsReview) result = result.filter((o) => o.hasPendingDesignReview)
    const query = search.trim().toLowerCase()
    if (query) {
      result = result.filter((order) =>
        [order.displayId, order.giftName, order.recipientName, order.campaignName, order.assignedVendorName, humanize(order.source)]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    }
    return result
  }, [orders, search, statusFilter, onlyNeedsReview])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" className="w-full sm:w-72" />
        </IconField>
        <Dropdown
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatusFilter(e.value)}
          className="w-full sm:w-52"
        />
        {canReviewDesign && needsReviewCount > 0 && (
          <button
            type="button"
            onClick={() => setOnlyNeedsReview((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              onlyNeedsReview ? 'border-accent bg-accent text-white' : 'border-accent/40 bg-accent-soft text-accent-ink hover:border-accent'
            }`}
          >
            <i className="pi pi-eye" /> {needsReviewCount} need{needsReviewCount === 1 ? 's' : ''} design review
          </button>
        )}
        <span className="ml-auto text-xs text-text-muted">
          {filtered.length} of {orders.length} order{orders.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="pi-search" title="No orders match" description="Try a different search term or status filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <DataTable
            value={filtered}
            dataKey="id"
            paginator
            rows={15}
            rowsPerPageOptions={[15, 30, 50]}
            sortMode="multiple"
            onRowClick={(e) => onOpen(e.data as Order)}
            rowClassName={() => 'cursor-pointer'}
            className="min-w-[860px]"
          >
            <Column
              header="Gift"
              sortField="giftName"
              sortable
              body={(row: Order) => (
                <div className="flex items-center gap-2.5">
                  <GiftThumb url={row.giftImageUrl} size="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{row.giftName ?? row.displayId}</p>
                    <p className="truncate text-xs text-text-muted">{row.displayId}</p>
                  </div>
                  {row.hasPendingDesignReview && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">
                      <i className="pi pi-eye text-[9px]" /> review
                    </span>
                  )}
                </div>
              )}
            />
            <Column header="Recipient" field="recipientName" sortable body={(row: Order) => row.recipientName ?? '—'} />
            <Column
              header="Source"
              sortField="campaignName"
              sortable
              body={(row: Order) => (row.source === 'CAMPAIGN' ? row.campaignName : humanize(row.source))}
            />
            <Column header="Vendor" field="assignedVendorName" sortable body={(row: Order) => row.assignedVendorName ?? '—'} />
            <Column
              header="Status"
              field="status"
              sortable
              body={(row: Order) => <StatusBadge status={row.status} label={humanize(row.status)} />}
            />
            <Column
              header="Price"
              field="totalPrice"
              sortable
              body={(row: Order) => formatCurrency(row.totalPrice)}
              style={{ textAlign: 'right' }}
              className="tabular-nums"
            />
            <Column
              header="Created"
              field="createdAt"
              sortable
              body={(row: Order) => new Date(row.createdAt).toLocaleDateString()}
            />
            <Column header="" body={() => <i className="pi pi-chevron-right text-xs text-text-muted" />} style={{ width: '2.5rem' }} />
          </DataTable>
        </div>
      )}
    </div>
  )
}

/** Charts and roll-ups, split off from the working table so the main tab stays fast and scannable at real data volumes. */
function OrdersAnalytics({ orders }: { orders: Order[] }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { PROCESSING: 0, PRODUCTION_QUEUE: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
    orders.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1))
    return counts
  }, [orders])

  const needsReviewCount = useMemo(() => orders.filter((o) => o.hasPendingDesignReview).length, [orders])

  const byVendor = useMemo(() => {
    const counts = new Map<string, number>()
    orders.forEach((o) => {
      const key = o.assignedVendorName ?? 'Unassigned'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [orders])

  const totalValue = useMemo(() => orders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0), [orders])

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total orders" value={orders.length} icon="pi-shopping-bag" />
        <StatCard label="In production" value={statusCounts.PRODUCTION_QUEUE} icon="pi-cog" accent="warning" />
        <StatCard label="Dispatched" value={statusCounts.DISPATCHED} icon="pi-send" accent="warning" />
        <StatCard label="Delivered" value={statusCounts.DELIVERED} icon="pi-check-circle" accent="success" />
        <StatCard label="Needs review" value={needsReviewCount} icon="pi-eye" accent={needsReviewCount > 0 ? 'danger' : 'success'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mb-2 text-sm font-medium text-text">Orders by status</p>
          <StatusDonutChart counts={statusCounts} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-medium text-text">Orders by vendor</p>
          {byVendor.length === 0 ? (
            <p className="text-sm text-text-muted">No orders yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {byVendor.map(([vendor, count]) => (
                <div key={vendor} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-text-muted">{vendor}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${orders.length ? (count / orders.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-medium text-text tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-text-muted">Total value across {orders.length} order{orders.length === 1 ? '' : 's'}</p>
        <p className="mt-1 text-2xl font-semibold text-text tabular-nums">{formatCurrency(totalValue)}</p>
      </div>
    </div>
  )
}

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders()
  const [selected, setSelected] = useState<Order | null>(null)
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every order generated from Quick Gift, Bulk Gifting, or an approved Campaign submission." />

      {!isLoading && orders?.length === 0 ? (
        <EmptyState icon="pi-shopping-bag" title="No orders yet" description="Orders appear here once a submission is approved." />
      ) : (
        <TabView>
          <TabPanel header="Orders">
            <OrdersTable orders={orders ?? []} onOpen={setSelected} />
          </TabPanel>
          <TabPanel header="Analytics">
            <OrdersAnalytics orders={orders ?? []} />
          </TabPanel>
        </TabView>
      )}

      <OrderDetailPanel
        order={selected}
        onHide={() => setSelected(null)}
        onPhotoLinkSent={(o, link) => setPhotoLinkPrompt({ link, recipientName: o.recipientName, phone: o.recipientPhone })}
      />
      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
