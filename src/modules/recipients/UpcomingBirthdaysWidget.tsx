import { Button } from 'primereact/button'
import { useNavigate } from 'react-router-dom'
import { useUpcomingBirthdays } from '@/hooks/useRecipients'

function whenLabel(daysUntilBirthday: number): string {
  if (daysUntilBirthday === 0) return 'Today!'
  if (daysUntilBirthday === 1) return 'Tomorrow'
  return `In ${daysUntilBirthday} days`
}

/**
 * Shown at the top of the Dashboard and the Recipients page -- recipients with a birthday
 * coming up in the next 30 days, each with a one-click way to send them a Quick Gift
 * (carries their details forward via router state, see QuickGiftLandingPage/QuickGiftFormPage).
 * Renders nothing while loading or once there's nothing upcoming, rather than an empty shell.
 */
export function UpcomingBirthdaysWidget() {
  const { data, isLoading } = useUpcomingBirthdays(30)
  const navigate = useNavigate()

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <i className="pi pi-heart-fill text-accent" />
        <p className="text-sm font-semibold text-text">Upcoming birthdays</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.map((recipient) => (
          <div
            key={recipient.id}
            className="flex min-w-[220px] shrink-0 items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{recipient.name}</p>
              <p className="text-xs text-text-muted">{whenLabel(recipient.daysUntilBirthday)}</p>
            </div>
            <Button
              icon="pi pi-bolt"
              label="Gift"
              size="small"
              outlined
              onClick={() => navigate('/quick-gift', { state: { prefillRecipient: recipient } })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
