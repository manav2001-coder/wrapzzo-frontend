import { Copy, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AccessTemplate } from '@/api/templates'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useCloneTemplate, useDeleteTemplate, useTemplates } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'
import { CompanyPicker } from './CompanyPicker'
import { TemplateDialog } from './TemplateDialog'

/**
 * Access templates: the only thing that grants. System masters (shared by every company) are
 * cloned by a company and edited by platform staff; a company builds its own, then maps them to
 * its roles on the Roles screen.
 */
export function TemplatesPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.TEMPLATE_EDIT)
  const { isPlatformStaff, companyId, picked, setPicked } = useAccessCompany()
  const { data: templates, isLoading } = useTemplates(companyId)
  const cloneTemplate = useCloneTemplate(companyId ?? '')
  const deleteTemplate = useDeleteTemplate()
  const [editing, setEditing] = useState<AccessTemplate | 'new' | null>(null)

  const list = templates ?? []
  // A system master is edited by platform staff only; everyone else clones it.
  const canChange = (template: AccessTemplate) => canEdit && (!template.system || isPlatformStaff)
  const editorScope = editing && editing !== 'new' ? editing.companyId : (companyId ?? null)

  async function clone(template: AccessTemplate) {
    try {
      const copy = await cloneTemplate.mutateAsync({ templateId: template.id, name: t('templates.copyName', { name: template.name }) })
      toast.success(t('templates.cloned', { name: copy.name }))
    } catch (error) {
      showError(error)
    }
  }

  async function remove(template: AccessTemplate) {
    try {
      await deleteTemplate.mutateAsync(template.id)
      toast.success(t('templates.deleted', { name: template.name }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={t('templates.title')}
        description={t('templates.subtitle')}
        createLabel={companyId ? t('templates.new') : t('templates.newSystem')}
        createPermission={P.TEMPLATE_EDIT}
        onCreate={companyId || isPlatformStaff ? () => setEditing('new') : undefined}
      />
      {isPlatformStaff && <CompanyPicker id="templates-company" value={picked} onChange={setPicked} />}

      {!isLoading && list.length === 0 ? (
        <EmptyState icon={ShieldCheck} size="sm" title={t('templates.empty')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((template) => (
            <SectionCard
              key={template.id}
              title={template.name}
              description={template.description ?? undefined}
              actions={
                <div className="flex items-center gap-1">
                  {template.system && <Badge variant="secondary">{t('templates.systemBadge')}</Badge>}
                  {!template.active && <Badge variant="outline">{t('templates.inactive')}</Badge>}
                  {companyId && canEdit && (
                    <IconButton icon={Copy} label={t('templates.clone', { name: template.name })} onClick={() => void clone(template)} />
                  )}
                  {canChange(template) && (
                    <>
                      <IconButton icon={Pencil} label={t('templates.edit', { name: template.name })} onClick={() => setEditing(template)} />
                      <IconButton icon={Trash2} label={t('templates.delete', { name: template.name })} onClick={() => void remove(template)} />
                    </>
                  )}
                </div>
              }
            >
              <p className="text-sm text-muted-foreground">
                {t('templates.summary', {
                  direct: template.accessControlIds.length,
                  total: template.effectiveAccessControlIds.length,
                  roles: template.roleCount,
                  users: template.userCount,
                })}
              </p>
            </SectionCard>
          ))}
        </div>
      )}

      {editing && (
        <TemplateDialog
          key={editing === 'new' ? 'new' : editing.id}
          companyId={editorScope}
          template={editing === 'new' ? undefined : editing}
          others={list.filter((other) => (editorScope ? true : other.system))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
