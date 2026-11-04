import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { CompanyFeatureKey } from '@/api/companyFeatureFlags'
import { SwitchField } from '@/components/fields/switch-field'
import { SectionCard } from '@/components/section-card'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanyFeatureFlags, useSetCompanyFeatureFlag } from '@/hooks/useCompanyFeatureFlags'

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
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
