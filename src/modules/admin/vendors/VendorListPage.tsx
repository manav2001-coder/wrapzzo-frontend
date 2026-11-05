import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Vendor } from '@/api/vendors'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { useCompanyScope } from '@/components/masters/company-scope-select'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { useVendors } from '@/hooks/useVendors'
import type { ListFieldMap } from '@/lib/list-fields'
import { rowsFetcher } from '@/lib/masters-api'
import { VendorMappingDialog } from './VendorMappingDialog'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  displayId: 'text',
  companyName: 'text',
  contactEmail: 'text',
  contactPhone: 'text',
  addedOn: 'date',
  addedByName: 'text',
}

const MAX_CHIPS = 3

/** Where a vendor serves, one chip per mapping across every company -- "Alembic · Summit". */
function ServesCell({ serves }: { serves: string[] }) {
  if (serves.length === 0) return <span className="text-sm text-muted-foreground">Nowhere yet</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {serves.slice(0, MAX_CHIPS).map((entry) => (
        <Badge key={entry} variant="secondary">
          {entry}
        </Badge>
      ))}
      {serves.length > MAX_CHIPS && <Badge variant="outline">+{serves.length - MAX_CHIPS} more</Badge>}
    </div>
  )
}

/**
 * Every vendor across all franchises, to look at. Platform staff do not add, edit, suspend or map them: each company's
 * admin runs its own vendors, so the only thing a row offers is to see where that vendor serves.
 */
export function VendorListPage() {
  const { t } = useTranslation('admin')
  // A vendor serves companies, so the list follows the company in scope: the vendors serving it.
  const scope = useCompanyScope()
  const { data: vendors, dataUpdatedAt, error, refetch } = useVendors(scope.companyId)
  const [viewing, setViewing] = useState<Vendor | null>(null)
  const fetchVendors = useMemo(() => rowsFetcher(vendors ?? [], (vendor: Vendor) => vendor.status === 'ACTIVE'), [vendors])

  const { statusColumn, auditColumns } = useMasterColumns<Vendor>({
    isActive: (vendor) => vendor.status === 'ACTIVE',
    statusLabels: { active: t('vendors.status.ACTIVE'), inactive: t('vendors.status.SUSPENDED') },
  })

  const columns = useMemo<ColumnDef<Vendor, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('vendors.column.vendor'), meta: { className: 'min-w-[200px]' }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: 'displayId', accessorKey: 'displayId', header: t('vendors.column.id'), meta: { className: 'min-w-[100px]' } },
      { id: 'companyName', accessorFn: (v) => v.companyName ?? '', header: t('vendors.column.company'), meta: { className: 'min-w-[160px]' } },
      {
        id: 'serves',
        accessorFn: (v) => v.serves.join(', '),
        header: t('vendors.column.serves'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[260px]' },
        cell: ({ row }) => <ServesCell serves={row.original.serves} />,
      },
      { id: 'contactEmail', accessorKey: 'contactEmail', header: t('vendors.column.email'), meta: { className: 'min-w-[200px]' } },
      { id: 'contactPhone', accessorFn: (v) => v.contactPhone ?? '', header: t('vendors.column.phone'), meta: { className: 'min-w-[130px]' } },
      statusColumn,
      ...auditColumns,
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[64px]' },
        cell: ({ row }) => <IconButton icon={Eye} label={`View where ${row.original.name} serves`} onClick={() => setViewing(row.original)} />,
      },
    ],
    [t, statusColumn, auditColumns],
  )

  return (
    <div>
      <MasterPageHeader title={t('vendors.title')} description={t('vendors.subtitle')} extra={scope.control} />
      <DataTable<Vendor>
        columns={columns}
        fetchData={fetchVendors}
        refreshTrigger={dataUpdatedAt}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        tableId="admin-vendors"
        configNamespace="admin-vendors"
        getRowId={(vendor) => vendor.id}
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Truck className="h-8 w-8 opacity-50" />,
          message: t('vendors.emptyTitle'),
          description: t('vendors.emptyBody'),
        })}
      />
      {viewing && <VendorMappingDialog vendor={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
