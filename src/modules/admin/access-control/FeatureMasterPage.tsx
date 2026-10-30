import { ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useFeatures, useSetFeatureActive } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'

/**
 * The feature master: every permission key, by module. The keys live in code, so nothing is added
 * here -- platform staff switch a key off (it then grants nothing, wherever a template carries
 * it) or back on. A company sees the keys it can hold, read-only.
 */
export function FeatureMasterPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { isPlatformStaff } = useAccessCompany()
  const { data: features, isLoading } = useFeatures()
  const setActive = useSetFeatureActive()
  const [query, setQuery] = useState('')

  const modules = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const groups = new Map<string, { label: string; items: NonNullable<typeof features> }>()
    for (const feature of features ?? []) {
      if (needle && !`${feature.category} ${feature.name} ${feature.key}`.toLowerCase().includes(needle)) continue
      const group = groups.get(feature.module) ?? { label: feature.category, items: [] }
      group.items.push(feature)
      groups.set(feature.module, group)
    }
    return [...groups.entries()]
  }, [features, query])

  return (
    <div className="space-y-6">
      <MasterPageHeader title={t('features.title')} description={t('features.subtitle')} />
      <div className="max-w-sm">
        <Input aria-label={t('features.search')} placeholder={t('features.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {!isLoading && modules.length === 0 ? (
        <EmptyState icon={ListChecks} size="sm" title={t('features.empty')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modules.map(([module, group]) => (
            <SectionCard key={module} title={group.label}>
              <ul className="divide-y">
                {group.items.map((feature) => (
                  <li key={feature.id} className="flex items-center gap-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{feature.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{feature.description ?? feature.key}</div>
                    </div>
                    <code className="hidden text-xs text-muted-foreground sm:inline">{feature.key}</code>
                    {!feature.companyAssignable && <Badge variant="outline">{t('features.platformOnly')}</Badge>}
                    <Switch
                      aria-label={t('features.toggle', { name: `${group.label}: ${feature.name}` })}
                      checked={feature.active}
                      disabled={!canEdit || !isPlatformStaff || setActive.isPending}
                      onCheckedChange={(active) => setActive.mutate({ featureId: feature.id, active }, { onError: showError })}
                    />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
