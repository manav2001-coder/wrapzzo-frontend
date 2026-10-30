import type { ColumnDef } from '@tanstack/react-table'
import { BadgeCheck } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import type { Role } from '@/api/roles'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useRoles } from '@/hooks/useRoles'
import type { ListFieldMap } from '@/lib/list-fields'
import { ScopeBar } from './ScopeBar'

const LIST_FIELDS: ListFieldMap = { name: 'text', userCount: 'number', templateCount: 'number' }

/** Role to Template, step 1: pick the role. */
export function RoleToTemplatePage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const { companyId, scoped } = useAccessCompany()
  const { data: roles, isLoading, error, refetch } = useRoles(companyId)

  const columns = useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('roles.column.name'), meta: { className: 'min-w-[220px]', align: 'left' }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: 'userCount', accessorKey: 'userCount', header: t('roles.column.users'), meta: { className: 'min-w-[90px]' } },
      { id: 'templateCount', accessorFn: (role) => role.templateIds.length, header: t('roles.column.templateCount'), meta: { className: 'min-w-[110px]' } },
      { id: 'status', accessorFn: (role) => (role.active ? 'active' : 'inactive'), header: t('field.status', { ns: 'common' }), meta: { className: 'min-w-[110px]' }, cell: ({ row }) => <StatusCell active={row.original.active} /> },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[140px]', align: 'right' },
        cell: ({ row }) => (
          <Button size="sm" variant="outline" aria-label={t('assign.open', { name: row.original.name })} onClick={() => navigate(scoped(`/access/role-templates/${row.original.id}`))}>
            {t('assign.assign')}
          </Button>
        ),
      },
    ],
    [t, navigate, scoped],
  )

  return (
    <div>
      <MasterPageHeader title={t('roleToTemplate.title')} description={t('roleToTemplate.listSubtitle')} />
      <ScopeBar id="r2t-company" />
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
          tableId="tbac-role-to-template"
          configNamespace="tbac-role-to-template"
          getRowId={(role) => role.id}
          emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <BadgeCheck className="h-8 w-8 opacity-50" />, message: t('roles.empty') })}
        />
      )}
    </div>
  )
}
