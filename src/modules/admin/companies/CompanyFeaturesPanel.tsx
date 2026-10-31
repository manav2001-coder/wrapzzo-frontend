import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { CompanyFeatureKey } from '@/api/companyFeatureFlags'
import { SwitchField } from '@/components/fields/switch-field'
import { ToggleGroupField } from '@/components/fields/toggle-group-field'
import { SectionCard } from '@/components/section-card'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import {
  useArtworkApprovalLevels,
  useCompanyFeatureFlags,
  useSetArtworkApprovalLevels,
  useSetCompanyFeatureFlag,
} from '@/hooks/useCompanyFeatureFlags'

const LEVEL_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))

/** How many managers above the MR approve artwork (Senior Artwork Approval): 1 = just their manager. */
function ArtworkApprovalLevelsField({ companyId }: { companyId: string }) {
  const { t } = useTranslation('admin')
  const { data: levels } = useArtworkApprovalLevels(companyId)
  const setLevels = useSetArtworkApprovalLevels(companyId)
  const showError = useApiErrorToast()

  async function change(value: string | string[]) {
    const next = Number(Array.isArray(value) ? value[0] : value)
    if (!next || next === levels) return
    try {
      await setLevels.mutateAsync(next)
      toast.success(t('companies.detail.approvalLevelsSaved', { count: next }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="ml-1 border-l-2 pl-4">
      <ToggleGroupField
        label={t('companies.detail.approvalLevels')}
        helperText={t('companies.detail.approvalLevelsHelp')}
        options={LEVEL_OPTIONS}
        exclusive
        value={levels ? String(levels) : ''}
        disabled={levels === undefined || setLevels.isPending}
        onValueChange={(value) => void change(value)}
      />
    </div>
  )
}

/** Optional workflow changes this company has turned on -- off by default, so nothing changes until a company opts in. */
export function CompanyFeaturesPanel({ companyId }: { companyId: string }) {
  const { t } = useTranslation('admin')
  const { data: flags, isLoading } = useCompanyFeatureFlags(companyId)
  const setFlag = useSetCompanyFeatureFlag(companyId)
  const showError = useApiErrorToast()

  async function toggle(flagKey: CompanyFeatureKey, enabled: boolean) {
    try {
      await setFlag.mutateAsync({ flagKey, enabled })
      toast.success(enabled ? t('companies.detail.featureEnabled') : t('companies.detail.featureDisabled'))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <SectionCard title={t('companies.detail.features')} description={t('companies.detail.featuresHelp')} loading={isLoading}>
      <div className="space-y-4">
        {flags?.map((flag) => (
          <div key={flag.flagKey} className="space-y-3">
            <SwitchField
              label={flag.displayName}
              helperText={flag.description}
              checked={flag.enabled}
              disabled={setFlag.isPending}
              onCheckedChange={(enabled) => void toggle(flag.flagKey, enabled)}
            />
            {flag.flagKey === 'MARKETING_DESIGN_APPROVAL' && flag.enabled && <ArtworkApprovalLevelsField companyId={companyId} />}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
