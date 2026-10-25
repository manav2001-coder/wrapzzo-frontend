import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useMyOrgUnits } from '@/hooks/useMyOrgUnits'
import { useAddMyVendor, useMyVendors } from '@/hooks/useMyVendors'
import { showApiError, showToast } from '@/lib/toast'

const COMPANY_WIDE = '__company_wide__'

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactEmail: z.string().min(1, 'Contact email is required').email('Enter a valid email'),
  contactPhone: z.string().optional(),
  orgUnitId: z.string(),
})

type VendorFormValues = z.infer<typeof vendorSchema>

function AddVendorDialog({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const addVendor = useAddMyVendor()
  const { data: orgUnits } = useMyOrgUnits()
  const orgUnitOptions = useMemo(
    () => [
      { label: 'Whole company', value: COMPANY_WIDE },
      ...(orgUnits ?? []).map((u) => ({ label: `${u.levelName}: ${u.name}`, value: u.id })),
    ],
    [orgUnits],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '', orgUnitId: COMPANY_WIDE },
  })

  async function onSubmit(values: VendorFormValues) {
    try {
      await addVendor.mutateAsync({
        name: values.name,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        orgUnitId: values.orgUnitId === COMPANY_WIDE ? null : values.orgUnitId,
      })
      showToast({ severity: 'success', summary: 'Vendor added', detail: 'An invite email was sent to set up their password.' })
      reset()
      onHide()
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <Dialog header="Add vendor" visible={visible} onHide={onHide} style={{ width: '28rem' }} modal>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vendor-name" className="text-sm font-medium text-text">
            Vendor name
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => <InputText id="vendor-name" {...field} className={errors.name ? 'p-invalid' : ''} />}
          />
          {errors.name && <small className="text-red-500 dark:text-red-400">{errors.name.message}</small>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vendor-email" className="text-sm font-medium text-text">
            Contact email
          </label>
          <Controller
            name="contactEmail"
            control={control}
            render={({ field }) => <InputText id="vendor-email" {...field} className={errors.contactEmail ? 'p-invalid' : ''} />}
          />
          {errors.contactEmail && <small className="text-red-500 dark:text-red-400">{errors.contactEmail.message}</small>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vendor-phone" className="text-sm font-medium text-text">
            Contact phone (optional)
          </label>
          <Controller name="contactPhone" control={control} render={({ field }) => <InputText id="vendor-phone" {...field} />} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="vendor-orgunit" className="text-sm font-medium text-text">
            Serves
          </label>
          <Controller
            name="orgUnitId"
            control={control}
            render={({ field }) => <Dropdown inputId="vendor-orgunit" {...field} options={orgUnitOptions} className="w-full" />}
          />
          <p className="text-xs text-text-muted">
            Scope this vendor to one org unit if they only fulfill orders there -- their gifts will only show up for MRs in that
            unit and the units beneath it.
          </p>
        </div>

        <Button type="submit" label="Add vendor" loading={addVendor.isPending} />
      </form>
    </Dialog>
  )
}

export function VendorsPage() {
  const { data: vendors, isLoading } = useMyVendors()
  const [addVisible, setAddVisible] = useState(false)

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="The vendors you work with -- only their gifts appear in your Gift Store, scoped to the org unit they serve."
        actions={<Button label="Add vendor" icon="pi pi-plus" onClick={() => setAddVisible(true)} />}
      />

      {!isLoading && vendors?.length === 0 ? (
        <EmptyState
          icon="pi-truck"
          title="No vendors yet"
          description="Add your own fulfillment vendor to start offering their gifts."
          action={<Button label="Add vendor" icon="pi pi-plus" onClick={() => setAddVisible(true)} />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {vendors?.map((vendor) => (
            <div key={vendor.mappingId} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div className="min-w-0">
                <p className="font-medium text-text">{vendor.vendorName}</p>
                <p className="flex items-center gap-1.5 text-xs text-text-muted">
                  <i className="pi pi-sitemap text-[10px]" />
                  {vendor.orgUnitName ? `Serves ${vendor.orgUnitName}` : 'Serves the whole company'}
                </p>
              </div>
              <StatusBadge status={vendor.vendorStatus} />
            </div>
          ))}
        </div>
      )}

      <AddVendorDialog visible={addVisible} onHide={() => setAddVisible(false)} />
    </div>
  )
}
