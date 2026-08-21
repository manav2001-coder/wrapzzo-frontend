import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { confirmDialog } from 'primereact/confirmdialog'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useAddVendor, useEditVendor, useResendVendorInvite, useSetVendorStatus, useVendor } from '@/hooks/useVendors'
import { showApiError, showToast } from '@/lib/toast'

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactEmail: z.string().min(1, 'Contact email is required').email('Enter a valid email address'),
  contactPhone: z.string().optional(),
})

const editVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactPhone: z.string().optional(),
})

type CreateVendorValues = z.infer<typeof createVendorSchema>
type EditVendorValues = z.infer<typeof editVendorSchema>

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: vendor, isLoading: isLoadingVendor } = useVendor(id)
  const addVendor = useAddVendor()
  const editVendor = useEditVendor(id ?? '')
  const setStatus = useSetVendorStatus(id ?? '')
  const resendInvite = useResendVendorInvite(id ?? '')

  const createForm = useForm<CreateVendorValues>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '' },
  })

  const editForm = useForm<EditVendorValues>({
    resolver: zodResolver(editVendorSchema),
    defaultValues: { name: '', contactPhone: '' },
  })

  useEffect(() => {
    if (vendor) editForm.reset({ name: vendor.name, contactPhone: vendor.contactPhone ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor])

  async function onCreateSubmit(values: CreateVendorValues) {
    try {
      const created = await addVendor.mutateAsync({
        name: values.name,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || undefined,
      })
      showToast({
        severity: 'success',
        summary: 'Invite sent',
        detail: `${created.contactEmail} will receive an email to set up their password.`,
      })
      navigate(`/admin/vendors/${created.id}`, { replace: true })
    } catch (error) {
      showApiError(error)
    }
  }

  async function onEditSubmit(values: EditVendorValues) {
    try {
      await editVendor.mutateAsync({ name: values.name, contactPhone: values.contactPhone || undefined })
      showToast({ severity: 'success', summary: 'Vendor updated' })
    } catch (error) {
      showApiError(error)
    }
  }

  function confirmStatusToggle() {
    if (!vendor) return
    const activating = vendor.status === 'SUSPENDED'
    confirmDialog({
      header: activating ? 'Reactivate vendor' : 'Suspend vendor',
      message: activating
        ? `${vendor.name} will regain access to the vendor portal.`
        : `${vendor.name} will lose access to the vendor portal until reactivated.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: activating ? undefined : 'p-button-danger',
      accept: async () => {
        try {
          await setStatus.mutateAsync(activating)
          showToast({ severity: 'success', summary: activating ? 'Vendor reactivated' : 'Vendor suspended' })
        } catch (error) {
          showApiError(error)
        }
      },
    })
  }

  async function handleResendInvite() {
    try {
      await resendInvite.mutateAsync()
      showToast({ severity: 'success', summary: 'Invite resent' })
    } catch (error) {
      showApiError(error)
    }
  }

  if (isEdit && isLoadingVendor) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? vendor?.name ?? 'Vendor' : 'Add vendor'}
        subtitle={
          isEdit && vendor
            ? `${vendor.displayId} · Update vendor details and manage status.`
            : 'Onboard a new fulfillment partner.'
        }
        backTo="/admin/vendors"
        actions={isEdit && vendor ? <StatusBadge status={vendor.status} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {isEdit ? (
        <Card title="Vendor details" className="lg:col-span-2">
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Vendor name
              </label>
              <Controller
                name="name"
                control={editForm.control}
                render={({ field }) => (
                  <InputText id="name" {...field} className={editForm.formState.errors.name ? 'p-invalid' : ''} />
                )}
              />
              {editForm.formState.errors.name && (
                <small className="text-red-500 dark:text-red-400">{editForm.formState.errors.name.message}</small>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text">Contact email</label>
              <InputText value={vendor?.contactEmail ?? ''} disabled />
              <small className="text-text-muted">Contact email is the vendor's login and can't be changed here.</small>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactPhone" className="text-sm font-medium text-text">
                Contact phone
              </label>
              <Controller
                name="contactPhone"
                control={editForm.control}
                render={({ field }) => <InputText id="contactPhone" {...field} placeholder="Optional" />}
              />
            </div>

            {vendor && (
              <p className="text-xs text-text-muted">Onboarded on {format(new Date(vendor.createdAt), 'dd MMM yyyy, HH:mm')}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                label="Save changes"
                loading={editVendor.isPending}
                disabled={!editForm.formState.isDirty}
              />
              {vendor && (
                <Button
                  type="button"
                  label={vendor.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                  severity={vendor.status === 'ACTIVE' ? 'danger' : 'success'}
                  outlined
                  loading={setStatus.isPending}
                  onClick={confirmStatusToggle}
                />
              )}
              <Button
                type="button"
                label="Resend setup invite"
                text
                loading={resendInvite.isPending}
                onClick={handleResendInvite}
              />
            </div>
            <small className="text-text-muted">
              If they never got the invite email, or their setup link expired, resend it above.
            </small>
          </form>
        </Card>
      ) : (
        <Card title="Vendor details" className="lg:col-span-2">
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Vendor name
              </label>
              <Controller
                name="name"
                control={createForm.control}
                render={({ field }) => (
                  <InputText id="name" {...field} className={createForm.formState.errors.name ? 'p-invalid' : ''} placeholder="Acme Print & Pack" />
                )}
              />
              {createForm.formState.errors.name && (
                <small className="text-red-500 dark:text-red-400">{createForm.formState.errors.name.message}</small>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactEmail" className="text-sm font-medium text-text">
                Contact email
              </label>
              <Controller
                name="contactEmail"
                control={createForm.control}
                render={({ field }) => (
                  <InputText
                    id="contactEmail"
                    {...field}
                    className={createForm.formState.errors.contactEmail ? 'p-invalid' : ''}
                    placeholder="vendor@example.com"
                  />
                )}
              />
              {createForm.formState.errors.contactEmail && (
                <small className="text-red-500 dark:text-red-400">{createForm.formState.errors.contactEmail.message}</small>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactPhone" className="text-sm font-medium text-text">
                Contact phone
              </label>
              <Controller
                name="contactPhone"
                control={createForm.control}
                render={({ field }) => <InputText id="contactPhone" {...field} placeholder="Optional" />}
              />
            </div>

            <small className="text-text-muted">
              They'll receive an email with a link to set up their own password -- no password is set here.
            </small>

            <Button type="submit" label="Create vendor" loading={addVendor.isPending} className="mt-2 self-start" />
          </form>
        </Card>
      )}
      </div>
    </div>
  )
}
