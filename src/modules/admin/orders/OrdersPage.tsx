import { Accordion, AccordionTab } from 'primereact/accordion'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import type { Order } from '@/api/orders'
import { EmptyState } from '@/components/EmptyState'
import { GiftThumb, OrderProgressBar, OrderStepper, StageHistoryList } from '@/components/OrderFulfillmentStepper'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import {
  useAssignCampaignVendor,
  useAssignOrderVendor,
  useAssignQuickGiftVendor,
  useAutoAssignCampaignVendor,
  useAutoAssignOrderVendor,
  useAutoAssignQuickGiftVendor,
  usePlatformOrders,
  useRequestPlatformOrderPhotoLink,
} from '@/hooks/useOrders'
import { useVendors } from '@/hooks/useVendors'
import { formatCurrency, humanize } from '@/lib/format'
import { groupByCampaign } from '@/lib/groupByCampaign'
import { showApiError, showToast } from '@/lib/toast'

function AssignmentControl({ order }: { order: Order }) {
  const { data: vendors } = useVendors()
  const assign = useAssignOrderVendor()
  const autoAssign = useAutoAssignOrderVendor()
  const [picking, setPicking] = useState(false)
  const [vendorId, setVendorId] = useState<string | undefined>(undefined)

  const activeVendors = (vendors ?? []).filter((v) => v.status === 'ACTIVE')

  async function handleAuto() {
    try {
      await autoAssign.mutateAsync(order.id)
      showToast({ severity: 'success', summary: 'Auto-assigned' })
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleManual() {
    if (!vendorId) return
    try {
      await assign.mutateAsync({ orderId: order.id, vendorId })
      showToast({ severity: 'success', summary: 'Vendor assigned' })
      setPicking(false)
    } catch (error) {
      showApiError(error)
    }
  }

  if (order.assignedVendorName) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-surface-muted px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">{order.assignedVendorName}</p>
            <p className="text-[11px] text-text-muted">
              {order.assignmentMode === 'AUTO' ? 'Auto-assigned' : 'Manually assigned'}
              {order.assignedAt ? ` · ${new Date(order.assignedAt).toLocaleDateString()}` : ''}
            </p>
          </div>
          {!picking && <Button label="Reassign" text size="small" onClick={() => setPicking(true)} />}
        </div>
        {picking && (
          <div className="flex flex-col gap-2">
            <Dropdown
              value={vendorId}
              onChange={(e) => setVendorId(e.value)}
              options={activeVendors.map((v) => ({ label: v.name, value: v.id }))}
              placeholder="Choose vendor"
              filter
              className="w-full"
            />
            <div className="flex gap-2">
              <Button label="Assign" size="small" loading={assign.isPending} disabled={!vendorId} onClick={handleManual} />
              <Button label="Cancel" text size="small" onClick={() => setPicking(false)} />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button label="Auto-assign" icon="pi pi-bolt" size="small" loading={autoAssign.isPending} onClick={handleAuto} />
      <div className="flex items-center gap-2">
        <Dropdown
          value={vendorId}
          onChange={(e) => setVendorId(e.value)}
          options={activeVendors.map((v) => ({ label: v.name, value: v.id }))}
          placeholder="Or pick a vendor"
          filter
          className="w-full flex-1"
        />
        <Button label="Assign" size="small" outlined loading={assign.isPending} disabled={!vendorId} onClick={handleManual} />
      </div>
    </div>
  )
}

/** Campaign-level bulk assignment -- one action for every unassigned order under a campaign, instead of repeating the per-order control one at a time. */
function CampaignBulkAssignControl({
  campaignId,
  campaignName,
  unassignedCount,
}: {
  campaignId: string
  campaignName: string
  unassignedCount: number
}) {
  const { data: vendors } = useVendors()
  const assignCampaign = useAssignCampaignVendor()
  const autoAssignCampaign = useAutoAssignCampaignVendor()
  const [picking, setPicking] = useState(false)
  const [vendorId, setVendorId] = useState<string | undefined>(undefined)

  const activeVendors = (vendors ?? []).filter((v) => v.status === 'ACTIVE')

  async function handleAuto() {
    try {
      const result = await autoAssignCampaign.mutateAsync(campaignId)
      if (result.skippedCount > 0) {
        showToast({
          severity: 'warn',
          summary: `${result.assignedCount} auto-assigned, ${result.skippedCount} skipped`,
          detail: 'No active vendor was available for the skipped order(s). Assign them manually.',
        })
      } else {
        showToast({ severity: 'success', summary: `${result.assignedCount} order${result.assignedCount === 1 ? '' : 's'} auto-assigned` })
      }
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleManual() {
    if (!vendorId) return
    try {
      const result = await assignCampaign.mutateAsync({ campaignId, vendorId })
      showToast({ severity: 'success', summary: `${result.assignedCount} order${result.assignedCount === 1 ? '' : 's'} assigned` })
      setPicking(false)
      setVendorId(undefined)
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-dashed border-border bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted">
        {unassignedCount} order{unassignedCount === 1 ? '' : 's'} in {campaignName} still need{unassignedCount === 1 ? 's' : ''} a vendor.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button label="Auto-assign all" icon="pi pi-bolt" size="small" loading={autoAssignCampaign.isPending} onClick={handleAuto} />
        {!picking ? (
          <Button label="Assign all to..." icon="pi pi-truck" size="small" outlined onClick={() => setPicking(true)} />
        ) : (
          <>
            <Dropdown
              value={vendorId}
              onChange={(e) => setVendorId(e.value)}
              options={activeVendors.map((v) => ({ label: v.name, value: v.id }))}
              placeholder="Choose vendor"
              filter
              className="w-48"
            />
            <Button label="Assign" size="small" loading={assignCampaign.isPending} disabled={!vendorId} onClick={handleManual} />
            <Button label="Cancel" text size="small" onClick={() => setPicking(false)} />
          </>
        )}
      </div>
    </div>
  )
}

/** Same bulk-assign convenience as CampaignBulkAssignControl, but for a company's Quick Gift
 * orders -- those have no campaign to key off, so companyId stands in for it. */
function QuickGiftBulkAssignControl({ companyId, companyName, unassignedCount }: { companyId: string; companyName: string; unassignedCount: number }) {
  const { data: vendors } = useVendors()
  const assignQuickGift = useAssignQuickGiftVendor()
  const autoAssignQuickGift = useAutoAssignQuickGiftVendor()
  const [picking, setPicking] = useState(false)
  const [vendorId, setVendorId] = useState<string | undefined>(undefined)

  const activeVendors = (vendors ?? []).filter((v) => v.status === 'ACTIVE')

  async function handleAuto() {
    try {
      const result = await autoAssignQuickGift.mutateAsync(companyId)
      if (result.skippedCount > 0) {
        showToast({
          severity: 'warn',
          summary: `${result.assignedCount} auto-assigned, ${result.skippedCount} skipped`,
          detail: 'No active vendor was available for the skipped order(s). Assign them manually.',
        })
      } else {
        showToast({ severity: 'success', summary: `${result.assignedCount} order${result.assignedCount === 1 ? '' : 's'} auto-assigned` })
      }
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleManual() {
    if (!vendorId) return
    try {
      const result = await assignQuickGift.mutateAsync({ companyId, vendorId })
      showToast({ severity: 'success', summary: `${result.assignedCount} order${result.assignedCount === 1 ? '' : 's'} assigned` })
      setPicking(false)
      setVendorId(undefined)
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-dashed border-border bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted">
        {unassignedCount} Quick Gift order{unassignedCount === 1 ? '' : 's'} for {companyName} still need{unassignedCount === 1 ? 's' : ''} a vendor.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button label="Auto-assign all" icon="pi pi-bolt" size="small" loading={autoAssignQuickGift.isPending} onClick={handleAuto} />
        {!picking ? (
          <Button label="Assign all to..." icon="pi pi-truck" size="small" outlined onClick={() => setPicking(true)} />
        ) : (
          <>
            <Dropdown
              value={vendorId}
              onChange={(e) => setVendorId(e.value)}
              options={activeVendors.map((v) => ({ label: v.name, value: v.id }))}
              placeholder="Choose vendor"
              filter
              className="w-48"
            />
            <Button label="Assign" size="small" loading={assignQuickGift.isPending} disabled={!vendorId} onClick={handleManual} />
            <Button label="Cancel" text size="small" onClick={() => setPicking(false)} />
          </>
        )}
      </div>
    </div>
  )
}

/** Same compact chip look as the Dashboard's order timeline widget -- a click opens the
 * full detail (photo, "send link" action, and stage-by-stage timeline) in a dialog.
 * AssignmentControl stays outside the chip, always visible, since routing a vendor is the
 * primary action on this page, not a detail to tuck away. */
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

function OrderCard({ order, onOpen }: { order: Order; onOpen: (order: Order) => void }) {
  return (
    <div className="flex w-full flex-col gap-3">
      <OrderChip order={order} onClick={() => onOpen(order)} />
      <AssignmentControl order={order} />
    </div>
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
  const requestPhotoLink = useRequestPlatformOrderPhotoLink()

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
                {order.displayId} · {order.companyName}
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
        </div>
      )}
    </Dialog>
  )
}

function CampaignAccordionHeader({ campaignName, orders }: { campaignName: string; orders: Order[] }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    orders.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1))
    return counts
  }, [orders])
  const needsAssignment = orders.filter((o) => !o.assignedVendorId && o.status !== 'CANCELLED').length

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 pr-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
          <i className="pi pi-megaphone text-sm" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-text">{campaignName}</p>
          <p className="text-xs text-text-muted">{orders[0].companyName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
          {orders.length} order{orders.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {needsAssignment > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500 dark:text-red-400">
            {needsAssignment} need assignment
          </span>
        )}
        {Object.entries(statusCounts).map(([status, count]) => (
          <StatusBadge key={status} status={status} label={`${count} ${humanize(status)}`} />
        ))}
      </div>
    </div>
  )
}

export function OrdersPage() {
  const { data: orders, isLoading } = usePlatformOrders()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selected, setSelected] = useState<Order | null>(null)
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { PROCESSING: 0, PRODUCTION_QUEUE: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
    orders?.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1))
    return counts
  }, [orders])

  const unassignedCount = useMemo(() => (orders ?? []).filter((o) => !o.assignedVendorId && o.status !== 'CANCELLED').length, [orders])

  const filtered = useMemo(() => {
    if (!orders) return []
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        o.companyName.toLowerCase().includes(q) ||
        (o.campaignName ?? '').toLowerCase().includes(q) ||
        (o.recipientName ?? '').toLowerCase().includes(q) ||
        o.displayId.toLowerCase().includes(q)
      )
    })
  }, [orders, search, statusFilter])

  const groups = useMemo(() => groupByCampaign(filtered), [filtered])

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every order across every company. Route each one to a vendor for fulfillment." />

      {!isLoading && orders?.length === 0 ? (
        <EmptyState
          icon="pi-shopping-bag"
          title="No orders yet"
          description="Orders appear here once a company's Campaign submission is approved (with Quick Gift and Bulk Gifting to follow)."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total orders" value={orders?.length ?? 0} icon="pi-shopping-bag" />
            <StatCard label="Needs assignment" value={unassignedCount} icon="pi-exclamation-circle" accent={unassignedCount > 0 ? 'danger' : 'success'} />
            <StatCard label="In production" value={statusCounts.PRODUCTION_QUEUE} icon="pi-cog" accent="warning" />
            <StatCard label="Delivered" value={statusCounts.DELIVERED} icon="pi-check-circle" accent="success" />
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
            <p className="mb-2 text-sm font-medium text-text">Orders by status</p>
            <StatusDonutChart counts={statusCounts} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, campaign, recipient..."
                className="w-full sm:w-72"
              />
            </IconField>
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
              {(['ALL', 'PROCESSING', 'PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border-none px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === s ? 'bg-accent text-white' : 'bg-transparent text-text-muted hover:text-text'
                  }`}
                >
                  {s === 'ALL' ? 'All' : humanize(s)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="pi-search" title="No orders match" />
          ) : (
            <>
              <p className="mb-2 text-xs text-text-muted">
                Each row groups orders by campaign, or by Quick Gift for one-off requests. Expand one to see its orders and assign vendors.
              </p>
              <Accordion multiple>
                {groups.map((group) => {
                  const unassignedInGroup = group.items.filter((o) => !o.assignedVendorId && o.status !== 'CANCELLED').length
                  const isRealCampaign = group.items[0]?.source === 'CAMPAIGN'
                  return (
                    <AccordionTab
                      key={group.campaignId}
                      header={<CampaignAccordionHeader campaignName={group.campaignName} orders={group.items} />}
                    >
                      {unassignedInGroup > 0 &&
                        (isRealCampaign ? (
                          <CampaignBulkAssignControl
                            campaignId={group.campaignId}
                            campaignName={group.campaignName}
                            unassignedCount={unassignedInGroup}
                          />
                        ) : (
                          <QuickGiftBulkAssignControl
                            companyId={group.items[0].companyId}
                            companyName={group.items[0].companyName}
                            unassignedCount={unassignedInGroup}
                          />
                        ))}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map((order) => (
                          <OrderCard key={order.id} order={order} onOpen={setSelected} />
                        ))}
                      </div>
                    </AccordionTab>
                  )
                })}
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
