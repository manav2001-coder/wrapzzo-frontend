import { Button } from 'primereact/button'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import type { Order, OrderStatus } from '@/api/orders'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import { useUpdateVendorOrderStatus, useVendorOrders } from '@/hooks/useVendorOrders'
import { formatCurrency, humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

/** The one forward step a vendor may move an order -- mirrors OrderService.VENDOR_TRANSITIONS server-side. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PRODUCTION_QUEUE: 'DISPATCHED',
  DISPATCHED: 'DELIVERED',
}
const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PRODUCTION_QUEUE: 'Mark dispatched',
  DISPATCHED: 'Mark delivered',
}

function OrderCard({ order }: { order: Order }) {
  const updateStatus = useUpdateVendorOrderStatus()
  const nextStatus = NEXT_STATUS[order.status]

  async function handleAdvance() {
    if (!nextStatus) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: nextStatus })
      showToast({ severity: 'success', summary: `Order marked ${humanize(nextStatus).toLowerCase()}` })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-text">{order.displayId}</p>
          <p className="text-xs text-text-muted">{order.companyName}</p>
        </div>
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
        <div>
          <p className="text-xs text-text-muted">Phone</p>
          <p className="text-text">{order.recipientPhone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Price</p>
          <p className="font-medium text-text">{formatCurrency(order.totalPrice)}</p>
        </div>
      </div>

      {nextStatus ? (
        <Button
          label={NEXT_ACTION_LABEL[order.status]}
          icon="pi pi-arrow-right"
          size="small"
          loading={updateStatus.isPending}
          onClick={handleAdvance}
        />
      ) : (
        <p className="text-center text-xs text-text-muted">
          {order.status === 'DELIVERED' ? 'Delivered -- fulfillment complete.' : 'No action needed from you right now.'}
        </p>
      )}
    </div>
  )
}

export function VendorOrdersPage() {
  const { data: orders, isLoading } = useVendorOrders()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { PROCESSING: 0, PRODUCTION_QUEUE: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
    orders?.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1))
    return counts
  }, [orders])

  const needsActionCount = useMemo(() => (orders ?? []).filter((o) => o.status in NEXT_STATUS).length, [orders])

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
        (o.giftName ?? '').toLowerCase().includes(q) ||
        o.displayId.toLowerCase().includes(q)
      )
    })
  }, [orders, search, statusFilter])

  return (
    <div>
      <PageHeader title="Orders" subtitle="Production and dispatch work assigned to you." />

      {!isLoading && orders?.length === 0 ? (
        <EmptyState
          icon="pi-inbox"
          title="No orders assigned yet"
          description="Once Wrapzzo routes an order to you for fulfillment, it'll show up here."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total orders" value={orders?.length ?? 0} icon="pi-shopping-bag" />
            <StatCard label="Needs action" value={needsActionCount} icon="pi-exclamation-circle" accent={needsActionCount > 0 ? 'danger' : 'success'} urgent={needsActionCount > 0} />
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
                placeholder="Search company, recipient, gift..."
                className="w-full sm:w-72"
              />
            </IconField>
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
              {(['ALL', 'PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="pi-search" title="No orders match" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
