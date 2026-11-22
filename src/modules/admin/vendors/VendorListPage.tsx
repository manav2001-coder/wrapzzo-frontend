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
import { LastActiveCell } from '@/components/last-active-cell'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useHasAccess } from '@/hooks/use-permission'
import { useVendors } from '@/hooks/useVendors'
import { ACTIVITY_PRESETS, matchesActivity, type ActivityPreset } from '@/lib/last-active'
import { P } from '@/lib/permissions'
import type { ListFieldMap } from '@/lib/list-fields'
import { rowsFetcher } from '@/lib/masters-api'
import { VendorMappingDialog } from './VendorMappingDialog'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  displayId: 'text',
  companyName: 'text',
  contactEmail: 'text',
  contactPhone: 'text',
  lastActiveAt: 'date',
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
  // Last active is for the Super Admin only. This list is read whole and filtered here, so its activity filter is applied here too.
  const canViewActivity = useHasAccess(P.PLATFORM_USER_ACTIVITY_VIEW)
  const [activity, setActivity] = useState<ActivityPreset | 'all'>('all')
  const shown = useMemo(
    () => (activity === 'all' ? (vendors ?? []) : (vendors ?? []).filter((vendor) => matchesActivity(activity, vendor.lastActiveAt))),
    [vendors, activity],
  )
  const fetchVendors = useMemo(() => rowsFetcher(shown, (vendor: Vendor) => vendor.status === 'ACTIVE'), [shown])

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
      ...(canViewActivity
        ? [
            {
              id: 'lastActiveAt',
              accessorFn: (v: Vendor) => v.lastActiveAt ?? '',
              header: t('activity.column'),
              enableColumnFilter: false,
              meta: { className: 'min-w-[150px]' },
              cell: ({ row }: { row: { original: Vendor } }) => <LastActiveCell value={row.original.lastActiveAt} />,
            },
          ]
        : []),
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
    [t, statusColumn, auditColumns, canViewActivity],
  )

  return (
    <div>
      <MasterPageHeader title={t('vendors.title')} description={t('vendors.subtitle')} extra={
          <div className="flex flex-wrap items-end gap-2">
            {scope.control}
            {canViewActivity && (
              <Select value={activity} onValueChange={(value) => setActivity(value as ActivityPreset | 'all')}>
                <SelectTrigger className="h-9 w-[220px]" aria-label={t('activity.filterLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('activity.filterLabel')}: {t('activity.all')}</SelectItem>
                  {ACTIVITY_PRESETS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`activity.preset.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />
      <DataTable<Vendor>
        columns={columns}
        fetchData={fetchVendors}
        // The table reloads when the vendors do, and when the activity filter changes (it is applied to the rows handed to the fetcher).
        refreshTrigger={dataUpdatedAt * 8 + (activity === 'all' ? 0 : ACTIVITY_PRESETS.indexOf(activity) + 1)}
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
