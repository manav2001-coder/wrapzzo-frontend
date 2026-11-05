import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MapPin, Mail, Pencil, Power, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAddMyVendor, useEditMyVendor, useMyVendors, useResendMyVendorInvite, useSetMyVendorActive } from '@/hooks/useMyVendors'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { CoveragePicker, coverageInput, isCoverageComplete, type Coverage } from './CoveragePicker'
import { VendorCoverageDialog } from './VendorCoverageDialog'
import { VendorMappingViewDialog } from './VendorMappingViewDialog'
import { rowsOf, type VendorRow } from './vendor-coverage'

const LIST_FIELDS: ListFieldMap = { vendorName: 'text', serves: 'text' }

/** A company adds its own vendor and says where it serves; an invite email lets the vendor set a password. */
function AddVendorDialog({ onClose }: { onClose: () => void }) {
  const showError = useApiErrorToast()
  const addVendor = useAddMyVendor()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coverage, setCoverage] = useState<Coverage>({ mode: 'units', selected: new Set() })
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSave = name.trim() !== '' && validEmail && isCoverageComplete(coverage)

  async function onSave() {
    try {
      await addVendor.mutateAsync({
        name: name.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim() || undefined,
        ...coverageInput(coverage),
      })
      toast.success('Vendor added', { description: `An invite email was sent to ${email.trim()} so they can set up their password.` })
      onClose()
    } catch (err) {
      showError(err, 'The vendor was not added.')
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Add vendor"
      description="Orders raised in a division or unit go only to vendors that serve it."
      confirmLabel="Add vendor"
      cancelLabel="Cancel"
      confirmDisabled={!canSave}
      loading={addVendor.isPending}
      onConfirm={() => void onSave()}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="vendor-name">Vendor name</Label>
          <Input id="vendor-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vendor-email">Contact email</Label>
            <Input id="vendor-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-phone">Contact phone</Label>
            <Input id="vendor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Serves</Label>
          <CoveragePicker value={coverage} onChange={setCoverage} />
        </div>
      </div>
    </AppDialog>
  )
}

/** A vendor's own name and phone -- its sign-in email and commercial terms are not changed here. */
function EditVendorDialog({ vendor, onClose }: { vendor: VendorRow; onClose: () => void }) {
  const showError = useApiErrorToast()
  const editVendor = useEditMyVendor()
  const [name, setName] = useState(vendor.vendorName)
  const [phone, setPhone] = useState('')

  async function onSave() {
    try {
      await editVendor.mutateAsync({ vendorId: vendor.vendorId, name: name.trim(), contactPhone: phone.trim() || undefined })
      toast.success('Vendor updated')
      onClose()
    } catch (err) {
      showError(err, `${vendor.vendorName} was not updated.`)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title={`Edit ${vendor.vendorName}`}
      confirmLabel="Save"
      cancelLabel="Cancel"
      confirmDisabled={name.trim() === ''}
      loading={editVendor.isPending}
      onConfirm={() => void onSave()}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-vendor-name">Vendor name</Label>
          <Input id="edit-vendor-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-vendor-phone">Contact phone</Label>
          <Input id="edit-vendor-phone" value={phone} placeholder="Leave blank to clear" onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
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

/** The vendors this company runs -- the company admin adds them, says which divisions and units each one serves, and can suspend them. */
export function VendorsPage() {
  const { data: mappings, isLoading, error, refetch } = useMyVendors()
  const showError = useApiErrorToast()
  const setActive = useSetMyVendorActive()
  const resendInvite = useResendMyVendorInvite()
  const canAssign = useHasAccess(P.COMPANY_VENDOR_ASSIGN)
  const canEdit = useHasAccess(P.COMPANY_VENDOR_EDIT)
  const canChangeStatus = useHasAccess(P.COMPANY_VENDOR_STATUS)
  const [adding, setAdding] = useState(false)
  const [mapping, setMapping] = useState<VendorRow | null>(null)
  const [viewing, setViewing] = useState<VendorRow | null>(null)
  const [editing, setEditing] = useState<VendorRow | null>(null)
  const [toggling, setToggling] = useState<VendorRow | null>(null)

  const rows = useMemo(() => rowsOf(mappings ?? []), [mappings])

  async function onResend(vendor: VendorRow) {
    try {
      await resendInvite.mutateAsync(vendor.vendorId)
      toast.success(`Invite resent to ${vendor.vendorName}`)
    } catch (err) {
      showError(err, `The invite to ${vendor.vendorName} was not sent.`)
    }
  }

  async function onToggle() {
    if (!toggling) return
    const activate = toggling.vendorStatus !== 'ACTIVE'
    try {
      await setActive.mutateAsync({ vendorId: toggling.vendorId, active: activate })
      toast.success(activate ? `${toggling.vendorName} reactivated` : `${toggling.vendorName} suspended`)
      setToggling(null)
    } catch (err) {
      showError(err, `${toggling.vendorName} was not ${activate ? 'reactivated' : 'suspended'}.`)
    }
  }

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
        meta: { className: 'w-[200px]' },
        cell: ({ row }) => {
          const vendor = row.original
          const active = vendor.vendorStatus === 'ACTIVE'
          return (
            <div className="flex justify-end gap-1">
              <IconButton icon={Eye} label={`View where ${vendor.vendorName} serves`} onClick={() => setViewing(vendor)} />
              {canEdit && <IconButton icon={Pencil} label={`Edit ${vendor.vendorName}`} onClick={() => setEditing(vendor)} />}
              {canAssign && active && <IconButton icon={MapPin} label={`Change where ${vendor.vendorName} serves`} onClick={() => setMapping(vendor)} />}
              {canEdit && <IconButton icon={Mail} label={`Resend invite to ${vendor.vendorName}`} onClick={() => void onResend(vendor)} />}
              {canChangeStatus && (
                <IconButton
                  icon={Power}
                  tone={active ? 'destructive' : 'success'}
                  label={active ? `Suspend ${vendor.vendorName}` : `Reactivate ${vendor.vendorName}`}
                  onClick={() => setToggling(vendor)}
                />
              )}
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canAssign, canEdit, canChangeStatus],
  )

  return (
    <div>
      <MasterPageHeader
        title="Vendors"
        description="Your printers, and which divisions and units each one serves. An order goes only to a vendor that serves where it was raised."
        createLabel="Add vendor"
        createPermission={P.COMPANY_VENDOR_ADD}
        onCreate={() => setAdding(true)}
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
          description: 'Add your first vendor and choose the divisions and units it serves.',
        })}
      />
      {adding && <AddVendorDialog onClose={() => setAdding(false)} />}
      {viewing && <VendorMappingViewDialog vendor={viewing} onClose={() => setViewing(null)} />}
      {mapping && <VendorCoverageDialog vendor={mapping} onClose={() => setMapping(null)} />}
      {editing && <EditVendorDialog vendor={editing} onClose={() => setEditing(null)} />}
      <AppDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        size="sm"
        title={toggling ? (toggling.vendorStatus === 'ACTIVE' ? `Suspend ${toggling.vendorName}?` : `Reactivate ${toggling.vendorName}?`) : ''}
        description={
          toggling?.vendorStatus === 'ACTIVE'
            ? 'It can no longer sign in, and no new orders are routed to it, until you reactivate it. Orders it already holds stay with it.'
            : 'It can sign in again and receive new orders for the divisions and units it serves.'
        }
        confirmLabel={toggling?.vendorStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        cancelLabel="Cancel"
        loading={setActive.isPending}
        onConfirm={() => void onToggle()}
      />
    </div>
  )
}
