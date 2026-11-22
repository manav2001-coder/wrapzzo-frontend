import { useTranslation } from 'react-i18next'

import { formatDateTimeWithZone } from '@/lib/datetime'
import { timeAgo } from '@/lib/last-active'

/** "2 hours ago", with the exact time on hover; "Never signed in" for someone who has not yet. */
export function LastActiveCell({ value }: { value: string | null | undefined }) {
  const { t, i18n } = useTranslation('admin')
  const ago = timeAgo(value, i18n.language)
  if (!ago || !value) return <span className="text-muted-foreground">{t('activity.never')}</span>
  return <span title={formatDateTimeWithZone(value)}>{ago}</span>
}
