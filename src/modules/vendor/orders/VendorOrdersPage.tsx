import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function VendorOrdersPage() {
  return (
    <div>
      <PageHeader title="Orders" subtitle="Production and dispatch work assigned to you." />
      <EmptyState
        icon="pi-inbox"
        title="No orders yet"
        description="Orders assigned to you for fulfillment will show up here once that's built."
      />
    </div>
  )
}
