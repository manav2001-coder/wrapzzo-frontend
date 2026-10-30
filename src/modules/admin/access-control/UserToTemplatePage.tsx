import type { ColumnDef } from '@tanstack/react-table'
import { Users } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import type { CompanyUser } from '@/api/users'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useCompanyUsers } from '@/hooks/useUsers'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { ScopeBar } from './ScopeBar'

const LIST_FIELDS: ListFieldMap = { name: 'text', email: 'text', roleName: 'text', orgUnitName: 'text' }

/**
 * User to Template, step 1: the company's users. Assign templates to one from its row, or tick
 * several and give them all the same templates at once (the assign screen takes the ids from here).
 */
export function UserToTemplatePage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const canEdit = useHasAccess(P.ACCESS_EDIT)
  const { companyId, scoped } = useAccessCompany()
  const { data: users, isLoading, error, refetch } = useCompanyUsers(companyId)
  const assign = (userIds: string[]) => navigate(scoped('/access/user-templates/assign'), { state: { userIds } })

  const columns = useMemo<ColumnDef<CompanyUser, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('users.column.name'), meta: { className: 'min-w-[200px]', align: 'left' }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: 'email', accessorKey: 'email', header: t('users.column.email'), meta: { className: 'min-w-[220px]' } },
      { id: 'roleName', accessorKey: 'roleName', header: t('users.column.role'), meta: { className: 'min-w-[140px]' } },
      { id: 'orgUnitName', accessorFn: (user) => user.orgUnitName ?? '', header: t('users.column.orgUnit'), meta: { className: 'min-w-[160px]' } },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[140px]', align: 'right' },
        cell: ({ row }) => (
          <Button size="sm" variant="outline" aria-label={t('assign.open', { name: row.original.name })} onClick={() => assign([row.original.id])}>
            {t('assign.assign')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, scoped],
  )

  return (
    <div>
      <MasterPageHeader title={t('userToTemplate.title')} description={t('userToTemplate.listSubtitle')} />
      <ScopeBar id="u2t-company" />
      {!companyId ? (
        <EmptyState icon={Users} size="sm" title={t('roles.pickCompany')} />
      ) : (
        <DataTable<CompanyUser>
          columns={columns}
          data={users ?? []}
          isLoading={isLoading}
          listFields={LIST_FIELDS}
          searchable
          showRowSelectionColumn={canEdit}
          pageSize={25}
          tableId="tbac-user-to-template"
          configNamespace="tbac-user-to-template"
          getRowId={(user) => user.id}
          renderBulkActions={(_options, selected) =>
            canEdit && selected.length > 0 ? (
              <Button size="sm" onClick={() => assign(selected.map((user) => user.id))}>
                {t('userToTemplate.assignToUsers', { count: selected.length })}
              </Button>
            ) : null
          }
          emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <Users className="h-8 w-8 opacity-50" />, message: t('userToTemplate.empty') })}
        />
      )}
    </div>
  )
}
