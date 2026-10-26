import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { Company } from '@/api/companies'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanies, useSetCompanyStatus } from '@/hooks/useCompanies'
import { formatDate } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { CompanyAvatar } from './CompanyAvatar'

const LIST_FIELDS: ListFieldMap = { name: 'text', displayId: 'text', createdAt: 'date' }

export function CompanyListPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const { data: companies, isLoading, error, refetch } = useCompanies()
  const setStatus = useSetCompanyStatus()
  const showError = useApiErrorToast()

  async function changeStatus(company: Company, active: boolean) {
    try {
      await setStatus.mutateAsync({ id: company.id, active })
      toast.success(active ? t('companies.activated') : t('companies.deactivated'))
    } catch (err) {
      showError(err)
    }
  }

  const { statusColumn, actionsColumn, deactivateDialog } = useMasterColumns<Company>({
    isActive: (company) => company.status === 'ACTIVE',
    onEdit: (company) => navigate(`/admin/companies/${company.id}`),
    onActivate: (company) => changeStatus(company, true),
    onDeactivate: (company) => changeStatus(company, false),
    editPermission: 'company.manage',
    deletePermission: 'company.manage',
    deactivateCopy: {
      label: t('action.deactivate', { ns: 'common' }),
      title: t('companies.deactivateTitle'),
      body: t('companies.deactivateBody'),
    },
    extraActions: (company) => (
      <IconButton icon={Users} label={t('companies.users')} onClick={() => navigate(`/admin/companies/${company.id}/users`)} />
    ),
  })

  const columns = useMemo<ColumnDef<Company, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('companies.column.company'),
        meta: { className: 'min-w-[220px]', align: 'left' },
        cell: ({ row }) => (
          <Link to={`/admin/companies/${row.original.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
            <CompanyAvatar company={row.original} />
            <span className="truncate">{row.original.name}</span>
          </Link>
        ),
      },
      { id: 'displayId', accessorKey: 'displayId', header: t('companies.column.id'), meta: { className: 'min-w-[110px]' } },
      statusColumn,
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('companies.column.onboarded'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[140px]' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      actionsColumn,
    ],
    [t, statusColumn, actionsColumn],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('companies.title')}
        description={t('companies.subtitle')}
        createLabel={t('companies.add')}
        createPermission="company.manage"
        onCreate={() => navigate('/admin/companies/new')}
      />
      <DataTable<Company>
        columns={columns}
        data={companies ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        tableId="admin-companies"
        configNamespace="admin-companies"
        getRowId={(company) => company.id}
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Building2 className="h-8 w-8 opacity-50" />,
          message: t('companies.emptyTitle'),
          description: t('companies.emptyBody'),
        })}
      />
      {deactivateDialog}
    </div>
  )
}
