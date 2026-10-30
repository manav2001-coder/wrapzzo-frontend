import { Layers } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AddReferencesResult } from '@/api/templates'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { TransferList } from '@/components/transfer-list'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useAddTemplateReferences, useRemoveTemplateReference, useTemplates } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'
import { CompanyPicker } from './CompanyPicker'
import { TemplateSelect } from './TemplateSelect'

/**
 * Templates to Template: compose a template out of others. Each candidate is judged on its own,
 * so the answer lists what was added and why anything was refused (another company's, inactive,
 * would loop, would nest too deep) rather than failing the whole batch.
 */
export function TemplatesToTemplatePage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { isPlatformStaff, companyId, picked, setPicked } = useAccessCompany()
  const { data: templates } = useTemplates(companyId)
  const addReferences = useAddTemplateReferences()
  const removeReference = useRemoveTemplateReference()
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [result, setResult] = useState<AddReferencesResult | null>(null)

  const all = templates ?? []
  const template = all.find((candidate) => candidate.id === templateId)
  const writable = Boolean(template) && canEdit && (!template!.system || isPlatformStaff)
  const included = new Set(template?.referencedTemplateIds)
  const toItem = (id: string) => ({ id, label: all.find((candidate) => candidate.id === id)?.name ?? id })
  // Who may be included is decided by the server (scope, loops); this only hides the obvious.
  const available = all
    .filter((candidate) => candidate.id !== templateId && candidate.active && !included.has(candidate.id) && (!template?.system || candidate.system))
    .map((candidate) => ({ id: candidate.id, label: candidate.name, hint: candidate.system ? t('templates.systemBadge') : undefined }))

  async function add(ids: string[]) {
    try {
      const outcome = await addReferences.mutateAsync({ templateId: template!.id, templateIds: ids })
      setResult(outcome)
      if (outcome.added > 0) toast.success(t('templatesToTemplate.added', { count: outcome.added }))
    } catch (error) {
      showError(error)
    }
  }

  async function remove(ids: string[]) {
    setResult(null)
    try {
      for (const referencedId of ids) await removeReference.mutateAsync({ templateId: template!.id, referencedId })
      toast.success(t('templatesToTemplate.removed', { count: ids.length }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader title={t('templatesToTemplate.title')} description={t('templatesToTemplate.subtitle')} />
      {isPlatformStaff && <CompanyPicker id="t2t-company" value={picked} onChange={(id) => { setPicked(id); setTemplateId(null); setResult(null) }} />}
      <TemplateSelect id="t2t-template" label={t('assign.template')} placeholder={t('assign.pickTemplate')} templates={all} value={templateId} onChange={(id) => { setTemplateId(id); setResult(null) }} />

      {!template ? (
        <EmptyState icon={Layers} size="sm" title={t('assign.pickTemplate')} />
      ) : (
        <>
          {!writable && <p className="text-sm text-muted-foreground">{template.system ? t('assign.systemReadOnly') : t('assign.noEditAccess')}</p>}
          <TransferList
            available={available}
            assigned={[...included].map(toItem)}
            disabled={!writable || addReferences.isPending || removeReference.isPending}
            availableTitle={t('templatesToTemplate.available')}
            assignedTitle={t('templatesToTemplate.assigned')}
            searchLabel={t('assign.search')}
            addLabel={t('assign.add')}
            removeLabel={t('assign.remove')}
            emptyAvailable={t('templatesToTemplate.noneAvailable')}
            emptyAssigned={t('templatesToTemplate.noneAssigned')}
            onAdd={(ids) => void add(ids)}
            onRemove={(ids) => void remove(ids)}
          />
          {result && result.errors.length > 0 && (
            <SectionCard title={t('templatesToTemplate.refused', { count: result.errors.length })} description={t('templatesToTemplate.outcome', { added: result.added, total: result.totalRequested })}>
              <ul className="space-y-1 text-sm" role="list">
                {result.errors.map((error) => (
                  <li key={error.templateId}>
                    <span className="font-medium">{error.name ?? error.templateId}</span>: {error.reason}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
