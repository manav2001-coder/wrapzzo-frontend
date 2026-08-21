import { Card } from 'primereact/card'
import { PageHeader } from '@/components/PageHeader'

export function AccessControlPage() {
  return (
    <div>
      <PageHeader title="Access Control" subtitle="Roles, permissions, and their assignment." />
      <Card>
        <p className="text-sm text-text-muted">Not built yet -- roles, permissions, and their assignment will show up here.</p>
      </Card>
    </div>
  )
}
