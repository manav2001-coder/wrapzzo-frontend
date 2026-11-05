import type { ColumnDef } from '@tanstack/react-table'
import { Link2, Pencil, Trash2, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { FormGenerator } from '@/components/fields/form-generator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/icon-button'
import { emailField, phoneField, selectField, textField } from '@/components/masters/master-fields'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { useHasAccess } from '@/hooks/use-permission'
import { useAddMyVendor, useMyVendors, useRemoveMyVendor } from '@/hooks/useMyVendors'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { VendorCoverageDialog } from './VendorCoverageDialog'
import { rowsOf, type VendorRow } from './vendor-coverage'

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

const MAX_CHIPS = 4

/** Where a vendor serves, as chips -- the whole company, or the divisions and units it is mapped to. */
function ServesCell({ row }: { row: VendorRow }) {
  if (row.wholeCompany) return <Badge variant="primary-soft">Whole company</Badge>
  if (row.units.length === 0) return <span className="text-sm text-muted-foreground">Nowhere yet</span>
  const shown = row.units.slice(0, MAX_CHIPS)
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((unit) => (
        <Badge key={unit.id} variant="secondary">
          {unit.name}
        </Badge>
      ))}
      {row.units.length > MAX_CHIPS && <Badge variant="outline">+{row.units.length - MAX_CHIPS} more</Badge>}
    </div>
  )
}

/** The vendors this company works with, and -- the company admin's job -- which divisions and units each one serves. */
export function VendorsPage() {
  const { data: mappings, isLoading, error, refetch } = useMyVendors()
  const showError = useApiErrorToast()
  const removeVendor = useRemoveMyVendor()
  const canAssign = useHasAccess(P.COMPANY_VENDOR_ASSIGN)
  const canRemove = useHasAccess(P.COMPANY_VENDOR_REMOVE)
  const [adding, setAdding] = useState(false)
  const [mapping, setMapping] = useState<VendorRow | 'new' | null>(null)
  const [removing, setRemoving] = useState<VendorRow | null>(null)

  const rows = useMemo(() => rowsOf(mappings ?? []), [mappings])

  const columns = useMemo<ColumnDef<VendorRow, unknown>[]>(
    () => [
      { id: 'vendorName', accessorKey: 'vendorName', header: 'Vendor', meta: { className: 'min-w-[200px]' } },
      {
        id: 'serves',
        accessorFn: (v) => (v.wholeCompany ? 'Whole company' : v.units.map((u) => u.name).join(', ')),
        header: 'Serves',
        meta: { className: 'min-w-[260px]' },
        cell: ({ row }) => <ServesCell row={row.original} />,
      },
      {
        id: 'vendorStatus',
        accessorKey: 'vendorStatus',
        header: 'Status',
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => <StatusCell active={row.original.vendorStatus === 'ACTIVE'} label={row.original.vendorStatus === 'ACTIVE' ? 'Active' : 'Suspended'} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[96px]' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canAssign && <IconButton icon={Pencil} label={`Change where ${row.original.vendorName} serves`} onClick={() => setMapping(row.original)} />}
            {canRemove && <IconButton icon={Trash2} tone="destructive" label={`Remove ${row.original.vendorName}`} onClick={() => setRemoving(row.original)} />}
          </div>
        ),
      },
    ],
    [canAssign, canRemove],
  )

  async function onRemove() {
    if (!removing) return
    try {
      await removeVendor.mutateAsync(removing.vendorId)
      toast.success(`${removing.vendorName} removed`)
      setRemoving(null)
    } catch (err) {
      showError(err, `${removing.vendorName} was not removed.`)
    }
  }

  return (
    <div>
      <MasterPageHeader
        title="Vendors"
        description="Your printers, and which divisions and units each one serves. An order goes only to a vendor that serves where it was raised."
        createLabel="Add vendor"
        createPermission={P.COMPANY_VENDOR_ADD}
        onCreate={() => setAdding(true)}
        extra={
          canAssign && (
            <Button variant="outline" size="sm" className="h-9" onClick={() => setMapping('new')}>
              <Link2 />
              Map existing vendor
            </Button>
          )
        }
      />
      <DataTable<VendorRow>
        columns={columns}
        data={rows}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        getRowId={(v) => v.vendorId}
        tableId="company-vendors"
        configNamespace="company-vendors"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Truck className="h-8 w-8 opacity-50" />,
          message: 'No vendors yet',
          description: 'Add a vendor, or map an existing one, to start routing orders.',
        })}
      />
      {adding && <AddVendorDialog onClose={() => setAdding(false)} />}
      {mapping && <VendorCoverageDialog vendor={mapping === 'new' ? undefined : mapping} onClose={() => setMapping(null)} />}
      <AppDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        size="sm"
        title={removing ? `Remove ${removing.vendorName}?` : ''}
        description="It stops receiving new orders from this company. Orders it already holds stay with it."
        confirmLabel="Remove vendor"
        cancelLabel="Cancel"
        loading={removeVendor.isPending}
        onConfirm={() => void onRemove()}
      />
    </div>
  )
}
