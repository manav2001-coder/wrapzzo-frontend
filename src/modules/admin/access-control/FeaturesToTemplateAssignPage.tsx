import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import type { AccessTemplate } from '@/api/templates'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { TransferList } from '@/components/transfer-list'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { assignableFeatures, useFeatures, useTemplates, useUpdateTemplate } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'

/**
 * Features to Template, step 2: move permission keys across for one template. A company template
 * is offered the company's registered, switched-on features; a system one, the whole catalogue.
 * What the template gets from the templates it includes is shown apart, since it is changed on
 * the template that grants it. An action brings its module's View with it (the server adds it).
 */
export function FeaturesToTemplateAssignPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const { templateId } = useParams<{ templateId: string }>()
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { isPlatformStaff, companyId, scoped } = useAccessCompany()
  const { data: templates } = useTemplates(companyId)
  const template = templates?.find((candidate) => candidate.id === templateId)
  const { data: features } = useFeatures(template?.system ? undefined : companyId)
  const update = useUpdateTemplate()

  const writable = Boolean(template) && canEdit && (!template!.system || isPlatformStaff)
  const offered = useMemo(() => assignableFeatures(features), [features])
  const byId = useMemo(() => new Map((features ?? []).map((feature) => [feature.id, feature])), [features])
  const toItem = (id: string) => ({ id, label: byId.has(id) ? `${byId.get(id)!.category}: ${byId.get(id)!.name}` : id })

  const direct = new Set(template?.accessControlIds)
  const available = offered.filter((feature) => !direct.has(feature.id)).map((feature) => toItem(feature.id))
  const inherited = (template?.effectiveAccessControlIds ?? []).filter((id) => !direct.has(id)).map(toItem)

  async function save(current: AccessTemplate, accessControlIds: string[]) {
    try {
      await update.mutateAsync({
        templateId: current.id,
        input: { name: current.name, description: current.description ?? undefined, active: current.active, accessControlIds, referencedTemplateIds: current.referencedTemplateIds },
      })
      toast.success(t('assign.updated', { name: current.name }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label={t('assign.back')} onClick={() => navigate(scoped('/access/features-to-template'))} />}
        title={template ? t('featuresToTemplate.assignTitle', { name: template.name }) : t('featuresToTemplate.title')}
        description={t('featuresToTemplate.subtitle')}
      />
      {!template ? (
        <EmptyState size="sm" title={t('assign.notFound')} />
      ) : (
        <>
          {!writable && <p className="text-sm text-muted-foreground">{template.system ? t('assign.systemReadOnly') : t('assign.noEditAccess')}</p>}
          <TransferList
            available={available}
            assigned={[...direct].map(toItem)}
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
