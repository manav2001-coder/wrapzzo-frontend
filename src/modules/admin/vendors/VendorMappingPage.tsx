import type { ColumnDef } from '@tanstack/react-table'
import { Trash2, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { CompanyVendor } from '@/api/companyVendors'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useCompanyVendors, useUnassignCompanyVendor } from '@/hooks/useCompanyVendors'
import { useVendors } from '@/hooks/useVendors'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { ScopeBar } from '../access-control/ScopeBar'
import { AssignVendorDialog } from './AssignVendorDialog'

const LIST_FIELDS: ListFieldMap = { vendorName: 'text', orgUnitName: 'text', vendorStatus: 'enum' }

/**
 * Which vendors serve which company, and where within it: the whole company or particular org
 * units (each covering everything beneath it). A vendor can serve many companies -- switch the
 * company in the scope bar -- and many org units of one. This is what scopes a company's Gift
 * Store and Quick Gift catalogue.
 */
export function VendorMappingPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canConfigure = useHasAccess(P.PLATFORM_COMPANY_CONFIGURE)
  const { companyId } = useAccessCompany()
  const { data: mappings, isLoading, error, refetch } = useCompanyVendors(companyId)
  const { data: vendors } = useVendors()
  const unassign = useUnassignCompanyVendor(companyId ?? '')
  const [assigning, setAssigning] = useState(false)

  async function remove(mapping: CompanyVendor) {
    try {
      await unassign.mutateAsync(mapping.mappingId)
      toast.success(t('vendorMapping.removed', { name: mapping.vendorName }))
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<CompanyVendor, unknown>[]>(
    () => [
      { id: 'vendorName', accessorKey: 'vendorName', header: t('vendorMapping.column.vendor'), meta: { className: 'min-w-[220px]', align: 'left' }, cell: ({ row }) => <span className="font-medium">{row.original.vendorName}</span> },
      {
        id: 'orgUnitName',
        accessorFn: (mapping) => mapping.orgUnitName ?? t('vendorMapping.wholeCompany'),
        header: t('vendorMapping.column.serves'),
        meta: { className: 'min-w-[200px]' },
      },
      {
        id: 'vendorStatus',
        accessorKey: 'vendorStatus',
        header: t('vendorMapping.column.status'),
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => <Badge variant={row.original.vendorStatus === 'ACTIVE' ? 'secondary' : 'outline'}>{t(row.original.vendorStatus === 'ACTIVE' ? 'vendorMapping.active' : 'vendorMapping.suspended')}</Badge>,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[80px]', align: 'right' },
        cell: ({ row }) =>
          canConfigure ? (
            <IconButton
              icon={Trash2}
              tone="destructive"
              label={t('vendorMapping.remove', { name: row.original.vendorName, place: row.original.orgUnitName ?? t('vendorMapping.wholeCompany') })}
              disabled={unassign.isPending}
              onClick={() => void remove(row.original)}
            />
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, canConfigure, unassign.isPending],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('vendorMapping.title')}
        description={t('vendorMapping.subtitle')}
        createLabel={t('vendorMapping.assign')}
        createPermission={P.PLATFORM_COMPANY_CONFIGURE}
        onCreate={companyId ? () => setAssigning(true) : undefined}
      />
      <ScopeBar id="vendors-company" />
      {!companyId ? (
        <EmptyState icon={Truck} size="sm" title={t('vendorMapping.pickCompany')} />
      ) : (
        <DataTable<CompanyVendor>
          columns={columns}
          data={mappings ?? []}
          isLoading={isLoading}
          listFields={LIST_FIELDS}
          searchable
          showRowSelectionColumn={false}
          pageSize={25}
          tableId="vendor-mapping"
          configNamespace="vendor-mapping"
          getRowId={(mapping) => mapping.mappingId}
          emptyState={listEmptyBody({ error, onRetry: () => void refetch(), icon: <Truck className="h-8 w-8 opacity-50" />, message: t('vendorMapping.empty') })}
        />
      )}
      {assigning && companyId && <AssignVendorDialog companyId={companyId} vendors={vendors ?? []} onClose={() => setAssigning(false)} />}
    </div>
  )
}
