import { Info, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ArtworkApprovalScope } from '@/api/artworkApproval'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useArtworkApprovalSettings, useSetArtworkApprovalSteps } from '@/hooks/useArtworkApproval'
import { useMenuLabel } from '@/hooks/use-menu-labels'
import { P } from '@/lib/permissions'

const MAX_STEPS = 5
const SCOPES: ArtworkApprovalScope[] = ['REPORTING_LINE', 'DIVISION']

interface DraftStep {
  roleId: string
  scope: ArtworkApprovalScope
}

/**
 * Who approves artwork after the AM, in order -- the company admin's to set, since only the company knows its roles.
 * Each step is a role and where to find the person holding it for the order at hand: the nearest one above the AM in
 * their reporting line, or anyone in the AM's division (the first to act decides). Anyone else in the chain only
 * watches. No steps at all keeps the simple "N managers up the line" behaviour.
 */
export function ArtworkApprovalSettingsPage() {
  const { t } = useTranslation('admin')
  const title = useMenuLabel('artwork-approval', t('artworkApproval.title'))
  const showError = useApiErrorToast()
  const canConfigure = useHasAccess(P.ARTWORK_APPROVAL_CONFIGURE)
  const { data: settings, isLoading } = useArtworkApprovalSettings()
  const save = useSetArtworkApprovalSteps()

  // Edits live in a draft, started from what is saved.
  const [draft, setDraft] = useState<DraftStep[] | null>(null)
  const saved = settings?.steps ?? []
  const steps: DraftStep[] = draft ?? saved.map(({ roleId, scope }) => ({ roleId, scope }))
  const complete = steps.every((step) => step.roleId)
  const changed = settings !== undefined && !(steps.length === saved.length && steps.every((s, i) => s.roleId === saved[i].roleId && s.scope === saved[i].scope))
  const editable = canConfigure && settings?.enabled === true

  const patch = (index: number, change: Partial<DraftStep>) => setDraft(steps.map((step, i) => (i === index ? { ...step, ...change } : step)))

  async function submit() {
    try {
      const result = await save.mutateAsync(steps)
      setDraft(null)
      toast.success(result.steps.length === 0 ? t('artworkApproval.cleared') : t('artworkApproval.saved', { count: result.steps.length }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div>
      <MasterPageHeader title={title} description={t('artworkApproval.subtitle')} />

      <SectionCard title={t('artworkApproval.steps')} description={t('artworkApproval.stepsHelp')} loading={isLoading}>
        <div className="space-y-4">
          {settings && !settings.enabled && (
            <p role="status" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {t('artworkApproval.notEnabled')}
            </p>
          )}

          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('artworkApproval.none', { count: settings?.levels ?? 1 })}</p>
          ) : (
            <ol className="space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="grid grid-cols-1 items-end gap-2 rounded-md border p-3 sm:grid-cols-[auto_1fr_1.4fr_auto]">
                  <span className="pb-2 text-sm font-semibold text-muted-foreground">{t('artworkApproval.stepN', { n: index + 1 })}</span>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('artworkApproval.role')}</Label>
                    <Select value={step.roleId} disabled={!editable} onValueChange={(roleId) => patch(index, { roleId })}>
                      <SelectTrigger aria-label={`${t('artworkApproval.role')} ${index + 1}`}>
                        <SelectValue placeholder={t('artworkApproval.pickRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(settings?.roles ?? []).map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('artworkApproval.findThem')}</Label>
                    <Select value={step.scope} disabled={!editable} onValueChange={(scope) => patch(index, { scope: scope as ArtworkApprovalScope })}>
                      <SelectTrigger aria-label={`${t('artworkApproval.findThem')} ${index + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPES.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {t(`artworkApproval.scope.${scope}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editable && (
                    <IconButton icon={Trash2} label={t('artworkApproval.remove', { n: index + 1 })} onClick={() => setDraft(steps.filter((_, i) => i !== index))} />
                  )}
                </li>
              ))}
            </ol>
          )}

          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={steps.length >= MAX_STEPS}
                onClick={() => setDraft([...steps, { roleId: '', scope: steps.length === 0 ? 'REPORTING_LINE' : 'DIVISION' }])}
              >
                <Plus />
                {t('artworkApproval.add')}
              </Button>
              <Button type="button" size="sm" disabled={!changed || !complete} loading={save.isPending} onClick={() => void submit()}>
                {t('artworkApproval.save')}
              </Button>
              {changed && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  {t('artworkApproval.discard')}
                </Button>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
