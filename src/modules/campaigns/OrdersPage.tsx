import { Accordion, AccordionTab } from 'primereact/accordion'
import { format } from 'date-fns'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import { useOrders } from '@/hooks/useOrders'
import { formatCurrency, humanize } from '@/lib/format'
import { groupByCampaign } from '@/lib/groupByCampaign'
import type { Order } from '@/api/orders'

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

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-text">{order.displayId}</p>
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
          <p className="text-xs text-text-muted">Source</p>
          <p className="text-text">{humanize(order.source)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Price</p>
          <p className="font-medium text-text">{formatCurrency(order.totalPrice)}</p>
        </div>
      </div>
      <p className="text-xs text-text-muted">Created {format(new Date(order.createdAt), 'dd MMM yyyy')}</p>
    </div>
  )
}

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders()
  const [search, setSearch] = useState('')

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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </AccordionTab>
                ))}
              </Accordion>
            </>
          )}
        </>
      )}
    </div>
  )
}
