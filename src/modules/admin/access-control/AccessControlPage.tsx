import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function AccessControlPage() {
  return (
    <div>
      <PageHeader title="Access Control" subtitle="Roles, permissions, and their assignment." />
      <EmptyState
        icon="pi-lock"
        title="Role management is on its way"
        description="You'll be able to create roles, grant permissions, and assign them to users from this page. For now, every company gets a Company Admin and a Member role automatically."
      />
    </div>
  )
}
