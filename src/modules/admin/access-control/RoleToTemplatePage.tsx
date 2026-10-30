import { BadgeCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { Combobox } from '@/components/fields/combobox'
import { MasterPageHeader } from '@/components/masters/master-page'
import { TransferList } from '@/components/transfer-list'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useReplaceRoleTemplates, useRoles } from '@/hooks/useRoles'
import { useTemplates } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'
import { CompanyPicker } from './CompanyPicker'

/** Role to Template: choose a role, then move the templates it carries across. A role grants nothing itself. */
export function RoleToTemplatePage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.ROLE_EDIT)
  const { isPlatformStaff, companyId, picked, setPicked } = useAccessCompany()
  const { data: roles } = useRoles(companyId)
  const { data: templates } = useTemplates(companyId)
  const replaceTemplates = useReplaceRoleTemplates(companyId ?? '')
  const [roleId, setRoleId] = useState<string | null>(null)

  const role = roles?.find((candidate) => candidate.id === roleId)
  const roleOptions = useMemo(() => (roles ?? []).map((candidate) => ({ value: candidate.id, label: candidate.name })), [roles])
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
      <MasterPageHeader title={t('roleToTemplate.title')} description={t('roleToTemplate.subtitle')} />
      {isPlatformStaff && <CompanyPicker id="r2t-company" value={picked} onChange={(id) => { setPicked(id); setRoleId(null) }} />}
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="r2t-role">{t('roleToTemplate.role')}</Label>
        <Combobox
          id="r2t-role"
          options={roleOptions}
          displayValue={(option) => option.label}
          getOptionKey={(option) => option.value}
          value={roleOptions.find((option) => option.value === roleId) ?? null}
          placeholder={t('roleToTemplate.pickRole')}
          disabled={!companyId}
          onChange={(next) => setRoleId((next as { value: string } | null)?.value ?? null)}
        />
      </div>

      {!role ? (
        <EmptyState icon={BadgeCheck} size="sm" title={t('roleToTemplate.pickRole')} />
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
