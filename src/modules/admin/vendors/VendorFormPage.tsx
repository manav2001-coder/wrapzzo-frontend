import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { confirmDialog } from 'primereact/confirmdialog'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useAddVendor, useEditVendor, useSetVendorStatus, useVendor } from '@/hooks/useVendors'
import { showApiError, showToast } from '@/lib/toast'

const createVendorSchema = z
  .object({
    name: z.string().min(1, 'Vendor name is required'),
    contactEmail: z.string().min(1, 'Contact email is required').email('Enter a valid email address'),
    contactPhone: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password.length >= 8, {
    message: 'Password must be at least 8 characters',
    path: ['password'],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
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

  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createForm = useForm<CreateVendorValues>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '', password: '', confirmPassword: '' },
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
      const result = await addVendor.mutateAsync({
        name: values.name,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || undefined,
        password: values.password || undefined,
        confirmPassword: values.confirmPassword || undefined,
      })
      showToast({ severity: 'success', summary: 'Vendor created' })
      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword)
      } else {
        navigate(`/admin/vendors/${result.vendor.id}`, { replace: true })
      }
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

  function copyPassword() {
    if (!temporaryPassword) return
    navigator.clipboard.writeText(temporaryPassword).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
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
        subtitle={isEdit ? 'Update vendor details and manage status.' : 'Onboard a new fulfillment partner.'}
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
            </div>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-text">
                  Password
                </label>
                <Controller
                  name="password"
                  control={createForm.control}
                  render={({ field }) => (
                    <Password
                      inputId="password"
                      {...field}
                      toggleMask
                      feedback={false}
                      inputClassName="w-full"
                      className="w-full"
                      placeholder="Leave blank to auto-generate"
                    />
                  )}
                />
                {createForm.formState.errors.password && (
                  <small className="text-red-500 dark:text-red-400">{createForm.formState.errors.password.message}</small>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-text">
                  Confirm password
                </label>
                <Controller
                  name="confirmPassword"
                  control={createForm.control}
                  render={({ field }) => (
                    <Password
                      inputId="confirmPassword"
                      {...field}
                      toggleMask
                      feedback={false}
                      inputClassName="w-full"
                      className="w-full"
                    />
                  )}
                />
                {createForm.formState.errors.confirmPassword && (
                  <small className="text-red-500 dark:text-red-400">{createForm.formState.errors.confirmPassword.message}</small>
                )}
              </div>
            </div>
            <small className="text-text-muted">
              Leave both password fields blank to have a secure one generated automatically -- you'll see it once, right
              after creation, to share with the vendor.
            </small>

            <Button type="submit" label="Create vendor" loading={addVendor.isPending} className="mt-2 self-start" />
          </form>
        </Card>
      )}
      </div>

      <Dialog
        header="Vendor created"
        visible={Boolean(temporaryPassword)}
        onHide={() => {
          setTemporaryPassword(null)
          if (addVendor.data) navigate(`/admin/vendors/${addVendor.data.vendor.id}`, { replace: true })
        }}
        style={{ width: '28rem' }}
      >
        <p className="mb-3 text-sm text-text-muted">
          Share this one-time password with the vendor securely -- it won't be shown again.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2">
          <code className="flex-1 font-mono text-sm text-text">{temporaryPassword}</code>
          <Button
            icon={copied ? 'pi pi-check' : 'pi pi-copy'}
            text
            rounded
            aria-label="Copy password"
            onClick={copyPassword}
          />
        </div>
      </Dialog>
    </div>
  )
}
