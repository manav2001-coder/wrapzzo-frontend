import { Cake, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { useUpcomingBirthdays } from '@/hooks/useRecipients'

/**
 * Recipients with a birthday in the next 30 days, each a click away from a Quick Gift that
 * carries their details forward (router state; see QuickGiftLandingPage). Renders nothing while
 * loading or once nothing is coming up, rather than an empty shell.
 */
export function UpcomingBirthdaysWidget() {
  const { t } = useTranslation('recipients')
  const { data, isLoading } = useUpcomingBirthdays(30)
  const navigate = useNavigate()

  if (isLoading || !data || data.length === 0) return null

  const when = (days: number) => (days === 0 ? t('birthdays.today') : days === 1 ? t('birthdays.tomorrow') : t('birthdays.inDays', { count: days }))

  return (
    <SectionCard
      className="mb-4"
      title={
        <span className="inline-flex items-center gap-2">
          <Cake className="h-4 w-4 text-primary" />
          {t('birthdays.title')}
        </span>
      }
    >
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {data.map((recipient) => (
          <li key={recipient.id} className="flex min-w-[220px] shrink-0 items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{recipient.name}</p>
              <p className="text-xs text-muted-foreground">{when(recipient.daysUntilBirthday)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/quick-gift', { state: { prefillRecipient: recipient } })}>
              <Zap />
              {t('birthdays.gift')}
            </Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
