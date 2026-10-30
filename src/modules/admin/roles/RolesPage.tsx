import type { ColumnDef } from '@tanstack/react-table'
import { BadgeCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Role } from '@/api/roles'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useDeleteRole, useRoles, useUpdateRole } from '@/hooks/useRoles'
import { useTemplates } from '@/hooks/useTemplates'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { ScopeBar } from '../access-control/ScopeBar'
import { RoleDialog } from './RoleDialog'

const LIST_FIELDS: ListFieldMap = { name: 'text', description: 'text', userCount: 'number', templates: 'text' }

/**
 * The roles master. Roles come first -- a company's roles are created here, users are then given
 * one (Users, or the import sheet), and each role is mapped to the access templates that decide
 * what its holders can do.
 */
export function RolesPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.ROLE_EDIT)
  const { companyId } = useAccessCompany()
  const { data: roles, isLoading, error, refetch } = useRoles(companyId)
  const { data: templates } = useTemplates(companyId)
  const updateRole = useUpdateRole(companyId ?? '')
  const deleteRole = useDeleteRole(companyId ?? '')
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const templateName = (id: string) => templates?.find((template) => template.id === id)?.name ?? id

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast.success(message)
    } catch (err) {
      showError(err)
    }
  }

  const setActive = (role: Role, active: boolean) =>
    run(
      () => updateRole.mutateAsync({ roleId: role.id, input: { name: role.name, description: role.description ?? undefined, active } }),
      t(active ? 'roles.activated' : 'roles.deactivated', { name: role.name }),
    )

  const { statusColumn, actionsColumn, deactivateDialog } = useMasterColumns<Role>({
    isActive: (role) => role.active,
    onEdit: (role) => setEditing(role),
    // Company Admin can't be deactivated; the server refuses, so it isn't offered either.
    onDeactivate: (role) => (role.protectedRole ? undefined : setActive(role, false)),
    onActivate: (role) => setActive(role, true),
    editPermission: P.ROLE_EDIT,
    deletePermission: P.ROLE_EDIT,
    extraActions: (role) =>
      role.protectedRole || !canEdit ? null : (
        <IconButton
          icon={Trash2}
          label={t('roles.delete', { name: role.name })}
          tone="destructive"
          onClick={() => void run(() => deleteRole.mutateAsync(role.id), t('roles.deleted', { name: role.name }))}
        />
      ),
  })

  const columns = useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('roles.column.name'),
        meta: { className: 'min-w-[200px]', align: 'left' },
        cell: ({ row }) => (
          <span className="flex items-center gap-2 font-medium">
            {row.original.name}
            {row.original.protectedRole && <Badge variant="secondary">{t('roles.protectedBadge')}</Badge>}
          </span>
        ),
      },
      { id: 'description', accessorFn: (role) => role.description ?? '', header: t('roles.column.description'), meta: { className: 'min-w-[200px]' } },
      { id: 'userCount', accessorKey: 'userCount', header: t('roles.column.users'), meta: { className: 'min-w-[90px]' } },
      {
        id: 'templates',
        accessorFn: (role) => role.templateIds.map(templateName).join(', '),
        header: t('roles.column.templates'),
        meta: { className: 'min-w-[240px]' },
        cell: ({ row }) => (row.original.templateIds.length === 0 ? <span className="text-muted-foreground">{t('roles.noTemplatesMapped')}</span> : row.original.templateIds.map(templateName).join(', ')),
      },
      statusColumn,
      actionsColumn,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, statusColumn, actionsColumn, templates],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('roles.title')}
        description={t('roles.subtitle')}
        createLabel={t('roles.new')}
        createPermission={P.ROLE_EDIT}
        onCreate={companyId ? () => setEditing('new') : undefined}
      />
      <ScopeBar id="roles-company" />
      {!companyId ? (
        <EmptyState icon={BadgeCheck} size="sm" title={t('roles.pickCompany')} />
      ) : (
        <DataTable<Role>
          columns={columns}
          data={roles ?? []}
          isLoading={isLoading}
          listFields={LIST_FIELDS}
          searchable
          showRowSelectionColumn={false}
          pageSize={25}
          tableId="tbac-roles"
          configNamespace="tbac-roles"
          getRowId={(role) => role.id}
          emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <BadgeCheck className="h-8 w-8 opacity-50" />, message: t('roles.empty') })}
        />
      )}
      {deactivateDialog}
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
