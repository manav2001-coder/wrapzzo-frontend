import type { CampaignStatus } from '@/api/campaigns'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { humanize } from '@/lib/format'

const VARIANT: Record<CampaignStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary-soft',
  ACTIVE: 'success-soft',
  CLOSED: 'warning-soft',
}

/** A campaign's lifecycle state, one look everywhere it appears. */
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {humanize(status)}
    </Badge>
  )
}
