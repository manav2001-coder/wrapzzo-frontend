import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useAddMyVendor, useMyVendors } from '@/hooks/useMyVendors'
import { showApiError, showToast } from '@/lib/toast'

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactEmail: z.string().min(1, 'Contact email is required').email('Enter a valid email'),
  contactPhone: z.string().optional(),
})

type VendorFormValues = z.infer<typeof vendorSchema>

function AddVendorDialog({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const addVendor = useAddMyVendor()
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '' },
  })

  async function onSubmit(values: VendorFormValues) {
    try {
      await addVendor.mutateAsync(values)
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
        subtitle="The vendors you work with -- only their gifts appear in your Gift Store."
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
            <div key={vendor.vendorId} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <p className="font-medium text-text">{vendor.vendorName}</p>
              <StatusBadge status={vendor.vendorStatus} />
            </div>
          ))}
        </div>
      )}

      <AddVendorDialog visible={addVisible} onHide={() => setAddVisible(false)} />
    </div>
  )
}
