import { Dropdown } from 'primereact/dropdown'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import type { OrderStatus } from '@/api/orders'
import type { VendorOrder } from '@/api/vendorOrders'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { useUpdateVendorOrderStatus, useVendorOrders } from '@/hooks/useVendorOrders'
import { formatCurrency, humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

/** Mirrors OrderService's VENDOR_SELECTABLE_STATUSES / VENDOR_EDITABLE_SOURCE_STATUSES server-side. */
const VENDOR_SELECTABLE_STATUSES: OrderStatus[] = ['PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED']
const VENDOR_EDITABLE_STATUSES: OrderStatus[] = ['PRODUCTION_QUEUE', 'DISPATCHED']
const STATUS_OPTIONS = VENDOR_SELECTABLE_STATUSES.map((status) => ({ label: humanize(status), value: status }))
const STATUS_ORDER: OrderStatus[] = ['PROCESSING', 'PRODUCTION_QUEUE', 'DISPATCHED', 'DELIVERED', 'CANCELLED']
const STATUS_COLORS: Record<string, string> = {
  PROCESSING: '#6366f1',
  PRODUCTION_QUEUE: '#f59e0b',
  DISPATCHED: '#f59e0b',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
}

/** A slim, glanceable proportion bar instead of a full donut section -- the counts already live in the stat cards above, so this only needs to convey the mix, not repeat the numbers at large size. */
function StatusBreakdownBar({ counts }: { counts: Record<string, number> }) {
  const entries = STATUS_ORDER.map((status) => ({ status, count: counts[status] ?? 0 })).filter((e) => e.count > 0)
  const total = entries.reduce((sum, e) => sum + e.count, 0)
  if (total === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface-muted">
        {entries.map((e) => (
          <div
            key={e.status}
            style={{ width: `${(e.count / total) * 100}%`, backgroundColor: STATUS_COLORS[e.status] }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map((e) => (
          <span key={e.status} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[e.status] }} />
            {humanize(e.status)} <span className="font-medium text-text">{e.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order, highlight = false }: { order: VendorOrder; highlight?: boolean }) {
  const updateStatus = useUpdateVendorOrderStatus()
  const editable = VENDOR_EDITABLE_STATUSES.includes(order.status)

  async function handleStatusChange(newStatus: OrderStatus) {
    if (newStatus === order.status) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: newStatus })
      showToast({ severity: 'success', summary: `Order moved to ${humanize(newStatus).toLowerCase()}` })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-shadow hover:shadow-md ${
        highlight ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] to-surface' : 'border-border bg-surface'
      }`}
    >
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
          <p className="truncate text-text">{order.recipientName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Gift</p>
          <p className="truncate text-text">{order.giftName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Phone</p>
          {order.recipientPhone ? (
            <a href={`tel:${order.recipientPhone}`} className="font-medium text-accent hover:underline">
              {order.recipientPhone}
            </a>
          ) : (
            <p className="text-text">—</p>
          )}
        </div>
        <div>
          <p className="text-xs text-text-muted">Price</p>
          <p className="font-medium text-text">{formatCurrency(order.price)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-xs text-text-muted">Recipient's photo</p>
        {order.recipientPhotoUrl ? (
          <a href={order.recipientPhotoUrl} target="_blank" rel="noreferrer">
            <img src={order.recipientPhotoUrl} alt="" className="h-8 w-8 rounded-md border border-border object-cover" />
          </a>
        ) : (
          <span className="text-xs text-text-muted">not uploaded yet</span>
        )}
      </div>

      {editable ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`status-${order.id}`} className="text-xs text-text-muted">
            Update status
          </label>
          <Dropdown
            inputId={`status-${order.id}`}
            value={order.status}
            options={STATUS_OPTIONS}
            onChange={(e) => handleStatusChange(e.value)}
            disabled={updateStatus.isPending}
            className="w-full"
          />
        </div>
      ) : (
        <p className="text-center text-xs text-text-muted">
          {order.status === 'DELIVERED'
            ? 'Delivered -- fulfillment complete.'
            : order.status === 'CANCELLED'
              ? 'Cancelled.'
              : 'No action needed from you right now.'}
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

  const actionable = useMemo(() => (orders ?? []).filter((o) => VENDOR_EDITABLE_STATUSES.includes(o.status)), [orders])

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
            <StatCard
              label="Needs action"
              value={actionable.length}
              icon="pi-exclamation-circle"
              accent={actionable.length > 0 ? 'danger' : 'success'}
              urgent={actionable.length > 0}
            />
            <StatCard label="In production" value={statusCounts.PRODUCTION_QUEUE} icon="pi-cog" accent="warning" />
            <StatCard label="Delivered" value={statusCounts.DELIVERED} icon="pi-check-circle" accent="success" />
          </div>

          <StatusBreakdownBar counts={statusCounts} />

          {actionable.length > 0 && (
            <div className="mb-8">
              <SectionHeader eyebrow="Priority" title={`Needs your action (${actionable.length})`} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {actionable.map((order) => (
                  <OrderCard key={order.id} order={order} highlight />
                ))}
              </div>
            </div>
          )}

          <SectionHeader eyebrow="Browse" title="All orders" />

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
