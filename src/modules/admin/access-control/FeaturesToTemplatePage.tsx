import { ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AccessTemplate } from '@/api/templates'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { TransferList } from '@/components/transfer-list'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useFeatures, useTemplates, useUpdateTemplate } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'
import { CompanyPicker } from './CompanyPicker'
import { TemplateSelect } from './TemplateSelect'

/**
 * Features to Template: choose a template, then move permission keys across. What the template
 * gets from the templates it includes is shown apart, since it is changed on the template that
 * grants it. An action brings its module's View with it (the server adds it).
 */
export function FeaturesToTemplatePage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { isPlatformStaff, companyId, picked, setPicked } = useAccessCompany()
  const { data: templates } = useTemplates(companyId)
  const { data: features } = useFeatures()
  const update = useUpdateTemplate()
  const [templateId, setTemplateId] = useState<string | null>(null)

  const template = templates?.find((candidate) => candidate.id === templateId)
  const writable = Boolean(template) && canEdit && (!template!.system || isPlatformStaff)
  const byId = useMemo(() => new Map((features ?? []).map((feature) => [feature.id, feature])), [features])
  const label = (id: string) => {
    const feature = byId.get(id)
    return { id, label: feature ? `${feature.category}: ${feature.name}` : id }
  }

  const direct = new Set(template?.accessControlIds)
  const assigned = [...direct].map(label)
  // A company template can't hold platform-only keys; a switched-off key can't be given.
  const available = (features ?? [])
    .filter((feature) => feature.active && !direct.has(feature.id) && (!template || template.system || feature.companyAssignable))
    .map((feature) => label(feature.id))
  const inherited = (template?.effectiveAccessControlIds ?? []).filter((id) => !direct.has(id)).map(label)

  async function save(current: AccessTemplate, accessControlIds: string[]) {
    try {
      await update.mutateAsync({
        templateId: current.id,
        input: {
          name: current.name,
          description: current.description ?? undefined,
          active: current.active,
          accessControlIds,
          referencedTemplateIds: current.referencedTemplateIds,
        },
      })
      toast.success(t('assign.updated', { name: current.name }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader title={t('featuresToTemplate.title')} description={t('featuresToTemplate.subtitle')} />
      {isPlatformStaff && <CompanyPicker id="f2t-company" value={picked} onChange={(id) => { setPicked(id); setTemplateId(null) }} />}
      <TemplateSelect id="f2t-template" label={t('assign.template')} placeholder={t('assign.pickTemplate')} templates={templates ?? []} value={templateId} onChange={setTemplateId} />

      {!template ? (
        <EmptyState icon={ShieldCheck} size="sm" title={t('assign.pickTemplate')} />
      ) : (
        <>
          {!writable && <p className="text-sm text-muted-foreground">{template.system ? t('assign.systemReadOnly') : t('assign.noEditAccess')}</p>}
          <TransferList
            available={available}
            assigned={assigned}
            disabled={!writable || update.isPending}
            availableTitle={t('featuresToTemplate.available')}
            assignedTitle={t('featuresToTemplate.assigned')}
            searchLabel={t('assign.search')}
            addLabel={t('assign.add')}
            removeLabel={t('assign.remove')}
            emptyAvailable={t('featuresToTemplate.noneAvailable')}
            emptyAssigned={t('featuresToTemplate.noneAssigned')}
            onAdd={(ids) => void save(template, [...direct, ...ids])}
            onRemove={(ids) => void save(template, [...direct].filter((id) => !ids.includes(id)))}
          />
          <SectionCard title={t('featuresToTemplate.inherited')} description={t('featuresToTemplate.inheritedHint')}>
            {inherited.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('featuresToTemplate.noneInherited')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {inherited.map((item) => (
                  <Badge key={item.id} variant="secondary">
                    {item.label}
                  </Badge>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
