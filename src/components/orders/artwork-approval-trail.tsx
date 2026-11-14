import { Check, Hourglass, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ArtworkApprovalStep } from '@/api/orderDesigns'
import { formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'

/**
 * A proof's way up the reporting line: the MR's review (level 0), each manager's decision, and --
 * while it is still climbing -- the level it waits on. A level someone covered for its manager
 * says so ("for Sanjay").
 */
export function ArtworkApprovalTrail({
  steps,
  pending,
}: {
  steps: ArtworkApprovalStep[]
  /** The level the proof waits on now, if it is still climbing. */
  pending?: { level: number; waitingOnName: string | null } | null
}) {
  const { t } = useTranslation('orders')
  if (steps.length === 0 && !pending) return null
  const levelName = (level: number) => (level === 0 ? t('artwork.trail.mr') : t('artwork.trail.level', { n: level }))

  return (
    <ol className="space-y-1 text-sm" aria-label={t('artwork.trail.title')}>
      {steps.map((step, i) => {
        const approved = step.decision === 'APPROVED'
        const Icon = approved ? Check : Undo2
        return (
          <li key={i} className="flex items-start gap-2">
            <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', approved ? 'text-success' : 'text-destructive')} />
            <span className="min-w-0">
              <span className="font-medium">{levelName(step.level)}</span>
              {' · '}
              {approved ? t('artwork.trail.approved', { name: step.decidedByName }) : t('artwork.trail.rejected', { name: step.decidedByName })}
              {step.onBehalfOfName && ` ${t('artwork.trail.onBehalf', { name: step.onBehalfOfName })}`}
              <span className="text-xs text-muted-foreground"> · {formatDateTime(step.decidedAt)}</span>
            </span>
          </li>
        )
      })}
      {pending && (
        <li className="flex items-start gap-2 text-muted-foreground">
          <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            <span className="font-medium">{levelName(pending.level)}</span>
            {' · '}
            {pending.waitingOnName ? t('artwork.trail.waiting', { name: pending.waitingOnName }) : t('artwork.trail.waitingAnyone')}
          </span>
        </li>
      )}
    </ol>
  )
}
