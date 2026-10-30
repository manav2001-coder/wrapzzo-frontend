import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { TransferList } from '@/components/transfer-list'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useReplaceRoleTemplates, useRoles } from '@/hooks/useRoles'
import { useTemplates } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'

/** Role to Template, step 2: move the templates a role carries across. A role grants nothing itself. */
export function RoleToTemplateAssignPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const { roleId } = useParams<{ roleId: string }>()
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.ROLE_EDIT)
  const { companyId, scoped } = useAccessCompany()
  const { data: roles } = useRoles(companyId)
  const { data: templates } = useTemplates(companyId)
  const replaceTemplates = useReplaceRoleTemplates(companyId ?? '')

  const role = roles?.find((candidate) => candidate.id === roleId)
  const mapped = new Set(role?.templateIds)
  const all = templates ?? []
  const toItem = (id: string) => ({ id, label: all.find((candidate) => candidate.id === id)?.name ?? id })
  const available = all
    .filter((candidate) => candidate.active && !mapped.has(candidate.id))
    .map((candidate) => ({ id: candidate.id, label: candidate.name, hint: candidate.system ? t('templates.systemBadge') : undefined }))

  async function save(templateIds: string[]) {
    try {
      await replaceTemplates.mutateAsync({ roleId: role!.id, templateIds })
      toast.success(t('assign.updated', { name: role!.name }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label={t('assign.back')} onClick={() => navigate(scoped('/access/role-templates'))} />}
        title={role ? t('roleToTemplate.assignTitle', { name: role.name }) : t('roleToTemplate.title')}
        description={t('roleToTemplate.subtitle')}
      />
      {!role ? (
        <EmptyState size="sm" title={t('assign.notFound')} />
      ) : (
        <TransferList
          available={available}
          assigned={[...mapped].map(toItem)}
          disabled={!canEdit || replaceTemplates.isPending}
          availableTitle={t('roleToTemplate.available')}
          assignedTitle={t('roleToTemplate.assigned', { name: role.name })}
          searchLabel={t('assign.search')}
          addLabel={t('assign.add')}
          removeLabel={t('assign.remove')}
          emptyAvailable={t('roleToTemplate.noneAvailable')}
          emptyAssigned={t('roleToTemplate.noneAssigned')}
          onAdd={(ids) => void save([...mapped, ...ids])}
          onRemove={(ids) => void save([...mapped].filter((id) => !ids.includes(id)))}
        />
      )}
    </div>
  )
}
