import { Badge, type BadgeProps } from '@/components/ui/badge'
import { humanize } from '@/lib/format'

const VARIANT: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success-soft',
  INACTIVE: 'secondary-soft',
  SUSPENDED: 'destructive-soft',
  DRAFT: 'secondary-soft',
  CLOSED: 'secondary-soft',
  PENDING: 'warning-soft',
  SUBMITTED: 'primary-soft',
  RESUBMITTED: 'primary-soft',
  APPROVED: 'success-soft',
  REJECTED: 'destructive-soft',
  PROCESSING: 'primary-soft',
  PRODUCTION_QUEUE: 'warning-soft',
  DISPATCHED: 'warning-soft',
  RECEIVED_AT_WAREHOUSE: 'warning-soft',
  OUT_FOR_DELIVERY: 'warning-soft',
  DELIVERED: 'success-soft',
  CANCELLED: 'destructive-soft',
}

/**
 * A badge for any status string -- for the places that mix kinds in one list (the dashboard's
 * drill-down rows). Where the kind is known, prefer its own badge (OrderStatusBadge,
 * CampaignStatusBadge, SubmissionStatusBadge).
 */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant={VARIANT[status] ?? 'secondary-soft'} className="whitespace-nowrap">
      {label ?? humanize(status)}
    </Badge>
  )
}
