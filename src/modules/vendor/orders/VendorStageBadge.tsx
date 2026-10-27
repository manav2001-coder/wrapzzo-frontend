import { useTranslation } from 'react-i18next'

import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { VendorStage } from '@/lib/vendor-order-stage'

const VARIANT: Record<VendorStage, BadgeProps['variant']> = {
  rework: 'destructive-soft',
  artwork: 'warning-soft',
  review: 'primary-soft',
  ready: 'success-soft',
  dispatched: 'primary-soft',
  warehouse: 'secondary-soft',
  delivered: 'secondary-soft',
  cancelled: 'secondary-soft',
}

/** The vendor's reading of an order: what it needs from them next. */
export function VendorStageBadge({ stage }: { stage: VendorStage }) {
  const { t } = useTranslation('vendor')
  return (
    <Badge variant={VARIANT[stage]} className="whitespace-nowrap">
      {t(`stage.${stage}`)}
    </Badge>
  )
}
