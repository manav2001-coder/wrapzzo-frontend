import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function VendorOrdersPage() {
  return (
    <div>
      <PageHeader title="Orders" subtitle="Production and dispatch work assigned to you." />
      <EmptyState
        icon="pi-inbox"
        title="Order fulfillment tracking is coming soon"
        description="Orders assigned to you for production and dispatch will appear here."
      />
    </div>
  )
}
