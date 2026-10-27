import type { ColumnDef } from '@tanstack/react-table'
import { Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { CompanyVendor } from '@/api/companyVendors'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { FormGenerator } from '@/components/fields/form-generator'
import { emailField, phoneField, selectField, textField } from '@/components/masters/master-fields'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { useAddMyVendor, useMyVendors } from '@/hooks/useMyVendors'
import type { ListFieldMap } from '@/lib/list-fields'

const COMPANY_WIDE = '__company_wide__'

const LIST_FIELDS: ListFieldMap = { vendorName: 'text', orgUnitName: 'text' }

/** A Company Admin onboards their own vendor; an invite email lets the vendor set a password. */
function AddVendorDialog({ onClose }: { onClose: () => void }) {
  const showError = useApiErrorToast()
  const addVendor = useAddMyVendor()
  const { data: orgUnits } = useMyOrgUnits()

  const fields = useMemo(
    () => [
      textField({ id: 'name', label: 'Vendor name', required: true, max: 200, spanToFullRow: true }),
      emailField({ id: 'contactEmail', label: 'Contact email', required: true }),
      phoneField({ id: 'contactPhone', label: 'Contact phone' }),
      selectField({
        id: 'orgUnitId',
        label: 'Serves',
        required: true,
        spanToFullRow: true,
        options: [
          { value: COMPANY_WIDE, label: 'Whole company' },
          ...(orgUnits ?? []).map((u) => ({ value: u.id, label: `${u.levelName}: ${u.name}` })),
        ],
      }),
    ],
    [orgUnits],
  )

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await addVendor.mutateAsync({
        name: String(values.name).trim(),
        contactEmail: String(values.contactEmail).trim(),
        contactPhone: String(values.contactPhone ?? '').trim() || undefined,
        orgUnitId: values.orgUnitId === COMPANY_WIDE ? null : String(values.orgUnitId),
      })
      toast.success('Vendor added', { description: 'An invite email was sent so they can set up their password.' })
      onClose()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Add vendor"
      description="Scope a vendor to one org unit if they only fulfil orders there: their gifts then show only for that unit and the units under it."
      footer={<></>}
    >
      <FormGenerator
        fields={fields}
        values={{ orgUnitId: COMPANY_WIDE }}
        mode="create"
        maxWidgetsPerRow={2}
        submitLabel="Add vendor"
        hideCardWrapper
        onSubmit={onSubmit}
      />
    </AppDialog>
  )
}

/** The vendors this company works with -- only their gifts appear in its Gift Store, scoped to the unit each serves. */
export function VendorsPage() {
  const { data: vendors, isLoading, error, refetch } = useMyVendors()
  const [adding, setAdding] = useState(false)

  const columns = useMemo<ColumnDef<CompanyVendor, unknown>[]>(
    () => [
      { id: 'vendorName', accessorKey: 'vendorName', header: 'Vendor', meta: { className: 'min-w-[200px]', align: 'left' } },
      {
        id: 'orgUnitName',
        accessorFn: (v) => v.orgUnitName ?? 'Whole company',
        header: 'Serves',
        meta: { className: 'min-w-[180px]' },
      },
      {
        id: 'vendorStatus',
        accessorKey: 'vendorStatus',
        header: 'Status',
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => <StatusCell active={row.original.vendorStatus === 'ACTIVE'} label={row.original.vendorStatus === 'ACTIVE' ? 'Active' : 'Suspended'} />,
      },
    ],
    [],
  )

  return (
    <div>
      <MasterPageHeader
        title="Vendors"
        description="The vendors you work with. Only their gifts appear in your Gift Store, scoped to the org unit they serve."
        createLabel="Add vendor"
        createPermission="company.vendor.manage"
        onCreate={() => setAdding(true)}
      />
      <DataTable<CompanyVendor>
        columns={columns}
        data={vendors ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        getRowId={(v) => v.mappingId}
        tableId="company-vendors"
        configNamespace="company-vendors"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Truck className="h-8 w-8 opacity-50" />,
          message: 'No vendors yet',
          description: 'Add your own fulfilment vendor to start offering their gifts.',
        })}
      />
      {adding && <AddVendorDialog onClose={() => setAdding(false)} />}
    </div>
  )
}
