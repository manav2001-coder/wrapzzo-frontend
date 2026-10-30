import { Pencil, BadgeCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Role } from '@/api/roles'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useDeleteRole, useRoles } from '@/hooks/useRoles'
import { useTemplates } from '@/hooks/useTemplates'
import { P } from '@/lib/permissions'
import { CompanyPicker } from '../access-control/CompanyPicker'
import { RoleDialog } from './RoleDialog'

/**
 * The roles master. Roles come first -- a company's roles are created here, users are then given
 * one (Users, or the import sheet), and each role is mapped to the access templates that decide
 * what its holders can do.
 */
export function RolesPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.ROLE_EDIT)
  const { isPlatformStaff, companyId, picked, setPicked } = useAccessCompany()
  const { data: roles, isLoading } = useRoles(companyId)
  const { data: templates } = useTemplates(companyId)
  const deleteRole = useDeleteRole(companyId ?? '')
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const templateName = (id: string) => templates?.find((template) => template.id === id)?.name ?? id

  async function remove(role: Role) {
    try {
      await deleteRole.mutateAsync(role.id)
      toast.success(t('roles.deleted', { name: role.name }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={t('roles.title')}
        description={t('roles.subtitle')}
        createLabel={t('roles.new')}
        createPermission={P.ROLE_EDIT}
        onCreate={companyId ? () => setEditing('new') : undefined}
      />
      {isPlatformStaff && <CompanyPicker id="roles-company" value={picked} onChange={setPicked} />}

      {!companyId ? (
        <EmptyState icon={BadgeCheck} size="sm" title={t('roles.pickCompany')} />
      ) : !isLoading && (roles ?? []).length === 0 ? (
        <EmptyState icon={BadgeCheck} size="sm" title={t('roles.empty')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(roles ?? []).map((role) => (
            <SectionCard
              key={role.id}
              title={role.name}
              description={role.description ?? undefined}
              actions={
                <div className="flex items-center gap-1">
                  {role.protectedRole && <Badge variant="secondary">{t('roles.protectedBadge')}</Badge>}
                  {!role.active && <Badge variant="outline">{t('templates.inactive')}</Badge>}
                  <IconButton icon={Pencil} label={t('roles.edit', { name: role.name })} onClick={() => setEditing(role)} />
                  {canEdit && !role.protectedRole && (
                    <IconButton icon={Trash2} label={t('roles.delete', { name: role.name })} onClick={() => void remove(role)} />
                  )}
                </div>
              }
            >
              <p className="text-sm text-muted-foreground">{t('roles.userCount', { count: role.userCount })}</p>
              <p className="mt-1 text-sm">
                {role.templateIds.length === 0 ? t('roles.noTemplatesMapped') : role.templateIds.map(templateName).join(', ')}
              </p>
            </SectionCard>
          ))}
        </div>
      )}

      {editing && companyId && (
        <RoleDialog
          key={editing === 'new' ? 'new' : editing.id}
          companyId={companyId}
          role={editing === 'new' ? undefined : editing}
          templates={templates ?? []}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
