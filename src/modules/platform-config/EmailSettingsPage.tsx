import { Check, Loader2, MailCheck, ShieldCheck, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ErrorTable } from '@/components/data-table/error-table'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useEmailSettings, useSetWorkflowEmails } from '@/hooks/use-email-settings'
import { useHasAccess } from '@/hooks/use-permission'
import { useUserTimezone } from '@/hooks/use-user-timezone'
import { formatDateTime } from '@/lib/datetime'
import { P } from '@/lib/permissions'

function EmailKinds({ title, items, tone }: { title: string; items: string[]; tone: 'off' | 'always' }) {
  const Icon = tone === 'off' ? X : Check
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {tone === 'off' ? <MailCheck className="h-4 w-4 text-muted-foreground" /> : <ShieldCheck className="h-4 w-4 text-success" />}
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Icon className={tone === 'off' ? 'mt-0.5 h-4 w-4 shrink-0 text-destructive/70' : 'mt-0.5 h-4 w-4 shrink-0 text-success'} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Platform config > Email settings (Super Admin): one switch for the emails the order workflow sends -- approvers told something waits
 * for them, reminders, decisions, the vendor's new-order and proof emails. Account setup and password emails are never affected, and
 * the screen says exactly which are and are not.
 */
export function EmailSettingsPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const timeZone = useUserTimezone()
  const canEdit = useHasAccess(P.PLATFORM_EMAIL_SETTINGS_EDIT)
  const { data, isLoading, error, refetch } = useEmailSettings()
  const save = useSetWorkflowEmails()

  async function onToggle(enabled: boolean) {
    try {
      await save.mutateAsync(enabled)
      toast.success(t('platformConfig.emailSettings.saved', { state: t(enabled ? 'platformConfig.emailSettings.savedOn' : 'platformConfig.emailSettings.savedOff') }))
    } catch (err) {
      showError(err)
    }
  }

  const covers = t('platformConfig.emailSettings.covers', { returnObjects: true }) as string[]
  const always = t('platformConfig.emailSettings.always', { returnObjects: true }) as string[]
  const on = data?.workflowEmailsEnabled ?? true

  return (
    <div className="space-y-4">
      <MasterPageHeader title={t('platformConfig.emailSettings.title')} description={t('platformConfig.emailSettings.subtitle')} />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error || !data ? (
        <ErrorTable error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <SectionCard
            title={t('platformConfig.emailSettings.cardTitle')}
            description={t('platformConfig.emailSettings.cardHelp')}
            actions={
              <div>
                <Badge variant={on ? 'success' : 'destructive'}>{t(on ? 'platformConfig.emailSettings.on' : 'platformConfig.emailSettings.off')}</Badge>
              </div>
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <label htmlFor="workflow-emails" className="text-sm font-medium">
                  {t('platformConfig.emailSettings.toggleLabel')}
                </label>
                <p className="text-sm text-muted-foreground">{t(on ? 'platformConfig.emailSettings.stateOn' : 'platformConfig.emailSettings.stateOff')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch id="workflow-emails" checked={on} disabled={!canEdit || save.isPending} onCheckedChange={(next) => void onToggle(next)} />
              </div>
            </div>
            {!on && <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">{t('platformConfig.emailSettings.warning')}</p>}
            <p className="mt-3 text-xs text-muted-foreground">
              {data.updatedAt && data.updatedByName
                ? t('platformConfig.emailSettings.lastChanged', { name: data.updatedByName, when: formatDateTime(data.updatedAt, { timeZone }) })
                : t('platformConfig.emailSettings.neverChanged')}
            </p>
          </SectionCard>
          <div className="grid gap-4 md:grid-cols-2">
            <EmailKinds title={t('platformConfig.emailSettings.coversTitle')} items={covers} tone="off" />
            <EmailKinds title={t('platformConfig.emailSettings.alwaysTitle')} items={always} tone="always" />
          </div>
        </>
      )}
    </div>
  )
}
