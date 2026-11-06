import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ArtworkApprovalScope } from '@/api/artworkApproval'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMenuLabel } from '@/hooks/use-menu-labels'
import { useHasAccess } from '@/hooks/use-permission'
import { useOrderApprovalSettings, useSetOrderApprovalSettings } from '@/hooks/useOrderApprovals'
import { P } from '@/lib/permissions'

const SCOPES: ArtworkApprovalScope[] = ['REPORTING_LINE', 'DIVISION']

interface Draft {
  enabled: boolean
  roleId: string
  scope: ArtworkApprovalScope
}

/**
 * Whether a Quick Gift / PEL order waits for an approver's yes before it goes to the vendor, and who that approver is:
 * a role, found either as the nearest one above the person who placed the order or as anyone holding it in their
 * division. The company admin's to set, since only the company knows its roles.
 */
export function OrderApprovalSettingsPage() {
  const { t } = useTranslation('admin')
  const title = useMenuLabel('order-approval', t('orderApproval.title'))
  const showError = useApiErrorToast()
  const canConfigure = useHasAccess(P.ORDER_APPROVAL_CONFIGURE)
  const { data: settings, isLoading } = useOrderApprovalSettings()
  const save = useSetOrderApprovalSettings()

  // Edits live in a draft, started from what is saved.
  const [draft, setDraft] = useState<Draft | null>(null)
  const saved: Draft = { enabled: settings?.enabled ?? false, roleId: settings?.roleId ?? '', scope: settings?.scope ?? 'REPORTING_LINE' }
  const current = draft ?? saved
  const changed = settings !== undefined && (current.enabled !== saved.enabled || current.roleId !== saved.roleId || current.scope !== saved.scope)
  const complete = !current.enabled || current.roleId !== ''
  const patch = (change: Partial<Draft>) => setDraft({ ...current, ...change })

  async function submit() {
    try {
      const result = await save.mutateAsync({ enabled: current.enabled, roleId: current.roleId || null, scope: current.scope })
      setDraft(null)
      toast.success(result.enabled ? t('orderApproval.savedOn', { role: result.roleName }) : t('orderApproval.savedOff'))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div>
      <MasterPageHeader title={title} description={t('orderApproval.subtitle')} />

      <SectionCard title={t('orderApproval.card')} description={t('orderApproval.cardHelp')} loading={isLoading}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <Label htmlFor="order-approval-enabled" className="text-sm font-medium">
              {t('orderApproval.require')}
            </Label>
            <Switch
              id="order-approval-enabled"
              checked={current.enabled}
              disabled={!canConfigure}
              onCheckedChange={(enabled) => patch({ enabled })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{t('orderApproval.role')}</Label>
              <Select value={current.roleId} disabled={!canConfigure} onValueChange={(roleId) => patch({ roleId })}>
                <SelectTrigger aria-label={t('orderApproval.role')}>
                  <SelectValue placeholder={t('orderApproval.pickRole')} />
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
              <Label className="text-xs">{t('orderApproval.findThem')}</Label>
              <Select value={current.scope} disabled={!canConfigure} onValueChange={(scope) => patch({ scope: scope as ArtworkApprovalScope })}>
                <SelectTrigger aria-label={t('orderApproval.findThem')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {t(`orderApproval.scope.${scope}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t('orderApproval.note')}</p>

          {canConfigure && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!changed || !complete} loading={save.isPending} onClick={() => void submit()}>
                {t('orderApproval.save')}
              </Button>
              {changed && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  {t('orderApproval.discard')}
                </Button>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
