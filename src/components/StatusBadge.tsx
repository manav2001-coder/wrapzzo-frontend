import { Tag } from 'primereact/tag'

const SEVERITY: Record<string, 'success' | 'danger' | 'warning' | 'secondary' | 'info'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'danger',
  // Campaigns (PRD 2.9)
  DRAFT: 'secondary',
  CLOSED: 'secondary',
  // Submissions (PRD 2.7)
  SUBMITTED: 'info',
  RESUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  // Orders (PRD 2.11)
  PROCESSING: 'info',
  PRODUCTION_QUEUE: 'warning',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  // Company user roles
  'Company Admin': 'info',
  Member: 'secondary',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Tag value={label ?? status} severity={SEVERITY[status] ?? 'secondary'} rounded className="whitespace-nowrap" />
}
