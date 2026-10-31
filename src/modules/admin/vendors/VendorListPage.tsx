import type { ColumnDef } from '@tanstack/react-table'
import { Mail, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Vendor } from '@/api/vendors'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { FormGenerator, type FormGeneratorHandle } from '@/components/fields/form-generator'
import { IconButton } from '@/components/icon-button'
import { decimalField, emailField, phoneField, textField } from '@/components/masters/master-fields'
import { MasterDrawer } from '@/components/masters/master-drawer'
import { useCompanyScope } from '@/components/masters/company-scope-select'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanies } from '@/hooks/useCompanies'
import { useAddVendor, useEditVendor, useReplaceVendorCoverage, useResendVendorInvite, useSetVendorStatus, useVendorCoverage, useVendors } from '@/hooks/useVendors'
import { formatDate } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { newCoverageRow, VendorCoverageEditor, type CoverageRow } from './VendorCoverageEditor'

const LIST_FIELDS: ListFieldMap = {
  name: 'text',
  displayId: 'text',
  contactEmail: 'text',
  contactPhone: 'text',
  markupFees: 'number',
  commission: 'number',
  createdAt: 'date',
}

const percent = (value: number | null) => (value == null ? '-' : `${value}%`)
/** A decimal form value back to a number, or undefined when left blank. */
const toNumber = (value: unknown) => (value === '' || value == null ? undefined : Number(value))

/**
 * Wrappzo's fulfilment vendors, as a MobixFL master: the list, with create and edit in a side
 * drawer so the list keeps its place. The drawer follows the URL (`/admin/vendors/new`,
 * `/admin/vendors/:id`), so a vendor can still be linked to directly.
 */
export function VendorListPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  // A vendor serves companies, so the list follows the company in scope: the vendors serving it.
  const scope = useCompanyScope()
  const { data: vendors, isLoading, error, refetch } = useVendors(scope.companyId)
  const { data: companies } = useCompanies()
  const replaceCoverage = useReplaceVendorCoverage()
  const addVendor = useAddVendor()
  const editVendor = useEditVendor()
  const setStatus = useSetVendorStatus()
  const resendInvite = useResendVendorInvite()
  const [handle, setHandle] = useState<FormGeneratorHandle | null>(null)
  const [coverage, setCoverage] = useState<CoverageRow[]>([])

  // The drawer is state, not a route (as in MobixFL): 'new' to add, a vendor's id to edit it.
  const [drawer, setDrawer] = useState<'new' | string | null>(null)
  const creating = drawer === 'new'
  const editing = drawer && !creating ? vendors?.find((vendor) => vendor.id === drawer) : undefined
  const drawerOpen = creating || Boolean(editing)
  const closeDrawer = () => setDrawer(null)

  // Where the vendor serves: a new vendor starts on the company in scope; an existing one loads its own.
  const { data: savedCoverage } = useVendorCoverage(editing?.id)
  useEffect(() => {
    if (creating) setCoverage(scope.companyId ? [newCoverageRow(scope.companyId)] : [])
    else if (savedCoverage) setCoverage(savedCoverage.map((entry) => ({ ...newCoverageRow(entry.companyId), whole: entry.orgUnitIds.length === 0, orgUnitIds: entry.orgUnitIds })))
  }, [creating, drawer, savedCoverage, scope.companyId])

  async function changeStatus(vendor: Vendor, active: boolean) {
    try {
      await setStatus.mutateAsync({ id: vendor.id, active })
      toast.success(active ? t('vendors.reactivated') : t('vendors.suspended'))
    } catch (err) {
      showError(err)
    }
  }

  async function resend(vendor: Vendor) {
    try {
      await resendInvite.mutateAsync(vendor.id)
      toast.success(t('vendors.inviteResent', { email: vendor.contactEmail }))
    } catch (err) {
      showError(err)
    }
  }

  const { statusColumn, actionsColumn, deactivateDialog } = useMasterColumns<Vendor>({
    isActive: (vendor) => vendor.status === 'ACTIVE',
    statusLabels: { active: t('vendors.status.ACTIVE'), inactive: t('vendors.status.SUSPENDED') },
    onEdit: (vendor) => setDrawer(vendor.id),
    onActivate: (vendor) => changeStatus(vendor, true),
    onDeactivate: (vendor) => changeStatus(vendor, false),
    editPermission: P.PLATFORM_VENDOR_STATUS,
    deletePermission: P.PLATFORM_VENDOR_STATUS,
    deactivateCopy: { label: t('vendors.suspend'), title: t('vendors.suspendTitle'), body: t('vendors.suspendBody') },
    extraActions: (vendor) => <IconButton icon={Mail} label={t('vendors.resendInvite')} onClick={() => void resend(vendor)} />,
  })

  const columns = useMemo<ColumnDef<Vendor, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('vendors.column.vendor'),
        meta: { className: 'min-w-[200px]', align: 'left' },
        cell: ({ row }) => (
          <button
            type="button"
            className="truncate font-medium hover:underline"
            onClick={() => setDrawer(row.original.id)}
          >
            {row.original.name}
          </button>
        ),
      },
      { id: 'displayId', accessorKey: 'displayId', header: t('vendors.column.id'), meta: { className: 'min-w-[100px]' } },
      { id: 'contactEmail', accessorKey: 'contactEmail', header: t('vendors.column.email'), meta: { className: 'min-w-[200px]' } },
      { id: 'contactPhone', accessorFn: (v) => v.contactPhone ?? '', header: t('vendors.column.phone'), meta: { className: 'min-w-[130px]' } },
      {
        id: 'markupFees',
        accessorKey: 'markupFees',
        header: t('vendors.column.markup'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => percent(row.original.markupFees),
      },
      {
        id: 'commission',
        accessorKey: 'commission',
        header: t('vendors.column.commission'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => percent(row.original.commission),
      },
      statusColumn,
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('vendors.column.onboarded'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[130px]' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      actionsColumn,
    ],
    [t, statusColumn, actionsColumn],
  )

  const fields = useMemo(
    () => [
      textField({ id: 'name', label: t('vendors.drawer.name'), required: true, spanToFullRow: true }),
      emailField({
        id: 'contactEmail',
        label: t('vendors.drawer.email'),
        required: true,
        lockedForEdit: !creating,
        description: creating ? undefined : t('vendors.drawer.emailLocked'),
      }),
      phoneField({ id: 'contactPhone', label: t('vendors.drawer.phone') }),
      decimalField({ id: 'markupFees', label: t('vendors.drawer.markup'), max: 100, scale: 2 }),
      decimalField({ id: 'commission', label: t('vendors.drawer.commission'), max: 100, scale: 2 }),
    ],
    [t, creating],
  )

  const values = useMemo(
    () =>
      editing
        ? {
            name: editing.name,
            contactEmail: editing.contactEmail,
            contactPhone: editing.contactPhone ?? '',
            markupFees: editing.markupFees == null ? '' : String(editing.markupFees),
            commission: editing.commission == null ? '' : String(editing.commission),
          }
        : undefined,
    [editing],
  )

  async function onSubmit(submitted: Record<string, unknown>) {
    const common = {
      name: String(submitted.name).trim(),
      contactPhone: String(submitted.contactPhone ?? '').trim() || undefined,
      markupFees: toNumber(submitted.markupFees),
      commission: toNumber(submitted.commission),
    }
    const rows = coverage.filter((row) => row.companyId)
    if (rows.some((row) => !row.whole && row.orgUnitIds.length === 0)) {
      toast.error(t('vendors.coverage.needUnits'))
      return
    }
    const companiesServed = rows.map((row) => ({ companyId: row.companyId as string, orgUnitIds: row.whole ? [] : row.orgUnitIds }))
    try {
      if (creating) {
        const email = String(submitted.contactEmail).trim()
        const added = await addVendor.mutateAsync({ ...common, contactEmail: email })
        if (companiesServed.length > 0) await replaceCoverage.mutateAsync({ id: added.id, companies: companiesServed })
        toast.success(t('vendors.drawer.invited', { email }))
      } else if (editing) {
        await editVendor.mutateAsync({ id: editing.id, input: common })
        await replaceCoverage.mutateAsync({ id: editing.id, companies: companiesServed })
        toast.success(t('vendors.drawer.updated'))
      }
      closeDrawer()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <div>
      <MasterPageHeader
        title={t('vendors.title')}
        description={t('vendors.subtitle')}
        createLabel={t('vendors.add')}
        createPermission={P.PLATFORM_VENDOR_CREATE}
        extra={scope.control}
        onCreate={() => setDrawer('new')}
      />
      <DataTable<Vendor>
        columns={columns}
        data={vendors ?? []}
        isLoading={isLoading}
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
      <MasterDrawer
        open={drawerOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        title={creating ? t('vendors.drawer.newTitle') : t('vendors.drawer.editTitle')}
        description={creating ? t('vendors.drawer.newDescription') : editing?.name}
        submitLabel={creating ? t('vendors.drawer.create') : undefined}
        handle={handle}
      >
        {drawerOpen && (
          <div className="space-y-6">
            <FormGenerator
              key={drawer}
              fields={fields}
              values={values}
              mode={creating ? 'create' : 'edit'}
              maxWidgetsPerRow={2}
              submitPermission={creating ? P.PLATFORM_VENDOR_CREATE : P.PLATFORM_VENDOR_EDIT}
              onSubmit={onSubmit}
              onReady={setHandle}
              hideCardWrapper
              hideSubmitButton
            />
            <VendorCoverageEditor value={coverage} onChange={setCoverage} companies={companies ?? []} />
          </div>
        )}
      </MasterDrawer>
      {deactivateDialog}
    </div>
  )
}
