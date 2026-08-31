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
import { humanize } from '@/lib/format'
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
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <i className="pi pi-megaphone text-sm" />
        </div>
        <span className="truncate font-medium text-text">{campaignName}</span>
        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
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

function CampaignOrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-text-muted">
            <th className="px-4 py-2 text-left font-medium">Order</th>
            <th className="px-4 py-2 text-left font-medium">Gift</th>
            <th className="px-4 py-2 text-left font-medium">Recipient</th>
            <th className="px-4 py-2 text-left font-medium">Source</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-2">{order.displayId}</td>
              <td className="px-4 py-2">{order.giftName ?? '—'}</td>
              <td className="px-4 py-2">{order.recipientName ?? '—'}</td>
              <td className="px-4 py-2">{humanize(order.source)}</td>
              <td className="px-4 py-2">
                <StatusBadge status={order.status} label={humanize(order.status)} />
              </td>
              <td className="px-4 py-2 whitespace-nowrap">{format(new Date(order.createdAt), 'dd MMM yyyy')}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

          <div className="mb-6 rounded-xl border border-border bg-surface p-4">
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
                    <CampaignOrdersTable orders={group.items} />
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
