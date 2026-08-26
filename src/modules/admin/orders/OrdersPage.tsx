import { Accordion, AccordionTab } from 'primereact/accordion'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import type { Order } from '@/api/orders'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import {
  useAssignCampaignVendor,
  useAssignOrderVendor,
  useAutoAssignCampaignVendor,
  useAutoAssignOrderVendor,
  usePlatformOrders,
} from '@/hooks/useOrders'
import { useVendors } from '@/hooks/useVendors'
import { humanize } from '@/lib/format'
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

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-text">{order.displayId}</p>
        <StatusBadge status={order.status} label={humanize(order.status)} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-text-muted">Recipient</p>
          <p className="text-text">{order.recipientName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Gift</p>
          <p className="text-text">{order.giftName ?? '—'}</p>
        </div>
      </div>

      <AssignmentControl order={order} />
    </div>
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
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <i className="pi pi-megaphone text-sm" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-text">{campaignName}</p>
          <p className="text-xs text-text-muted">{orders[0].companyName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
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
        o.campaignName.toLowerCase().includes(q) ||
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

          <div className="mb-6 rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-medium text-text">Orders by status</p>
            <StatusDonutChart counts={statusCounts} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, campaign, recipient..." className="w-full sm:w-72" />
            {(['ALL', 'PROCESSING', 'PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
              <Button
                key={s}
                label={s === 'ALL' ? 'All' : humanize(s)}
                size="small"
                outlined={statusFilter !== s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="pi-search" title="No orders match" />
          ) : (
            <>
              <p className="mb-2 text-xs text-text-muted">Each row is a campaign. Expand it to see its orders and assign vendors.</p>
              <Accordion multiple>
                {groups.map((group) => {
                  const unassignedInGroup = group.items.filter((o) => !o.assignedVendorId && o.status !== 'CANCELLED').length
                  return (
                    <AccordionTab
                      key={group.campaignId}
                      header={<CampaignAccordionHeader campaignName={group.campaignName} orders={group.items} />}
                    >
                      {unassignedInGroup > 0 && (
                        <CampaignBulkAssignControl
                          campaignId={group.campaignId}
                          campaignName={group.campaignName}
                          unassignedCount={unassignedInGroup}
                        />
                      )}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map((order) => (
                          <OrderCard key={order.id} order={order} />
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
    </div>
  )
}
