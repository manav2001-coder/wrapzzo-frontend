import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'

const UPCOMING = [
  {
    icon: 'pi-list',
    title: 'Incoming orders',
    description: 'Every order created from Quick Gift, Bulk Gifting, or a Campaign will land here for oversight.',
  },
  {
    icon: 'pi-bolt',
    title: 'Auto-assign to vendors',
    description: 'Let Wrapzzo route an order to an available, capable vendor automatically based on capacity and fit.',
  },
  {
    icon: 'pi-user-plus',
    title: 'Assign to a specific vendor',
    description: 'Or hand-pick which vendor should fulfill an order when you need direct control.',
  },
]

export function OrdersPage() {
  return (
    <div>
      <PageHeader title="Orders" subtitle="Oversee orders and route them to vendors for fulfillment." />

      <EmptyState
        icon="pi-shopping-bag"
        title="Orders will show up here once gifting goes live"
        description="This tab is reserved for the Order engine -- it depends on Quick Gift, Bulk Gifting and Campaigns shipping first, per the product build order."
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {UPCOMING.map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-surface p-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
              <i className={`pi ${item.icon}`} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-text">{item.title}</h3>
            <p className="mt-1 text-sm text-text-muted">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
