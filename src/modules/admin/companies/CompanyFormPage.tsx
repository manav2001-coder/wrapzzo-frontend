import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { confirmDialog } from 'primereact/confirmdialog'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { FileUpload } from 'primereact/fileupload'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Controller, useForm } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { uploadCompanyLogo } from '@/api/companies'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCompany, useCreateCompany, useSetCompanyStatus, useUpdateCompany, useUploadCompanyLogo } from '@/hooks/useCompanies'
import { showApiError, showToast } from '@/lib/toast'

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
})

type CompanyFormValues = z.infer<typeof companySchema>

export function CompanyFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: company, isLoading: isLoadingCompany } = useCompany(id)
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany(id ?? '')
  const setStatus = useSetCompanyStatus(id ?? '')
  const uploadLogo = useUploadCompanyLogo(id ?? '')

  // Create mode only -- staged locally since a company needs to exist (an
  // id) before the backend's presign/attach endpoints have anywhere to
  // point. Uploaded for real right after the company record is created.
  const [pendingLogo, setPendingLogo] = useState<File | null>(null)
  const [isUploadingPendingLogo, setIsUploadingPendingLogo] = useState(false)
  const pendingLogoPreview = useMemo(() => (pendingLogo ? URL.createObjectURL(pendingLogo) : null), [pendingLogo])
  useEffect(() => {
    return () => {
      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview)
    }
  }, [pendingLogoPreview])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (company) reset({ name: company.name })
  }, [company, reset])

  async function onSubmit(values: CompanyFormValues) {
    try {
      if (isEdit && id) {
        await updateCompany.mutateAsync(values.name)
        showToast({ severity: 'success', summary: 'Company updated' })
        return
      }

      const created = await createCompany.mutateAsync(values.name)

      if (pendingLogo) {
        setIsUploadingPendingLogo(true)
        try {
          await uploadCompanyLogo(created.id, pendingLogo)
        } catch (error) {
          showApiError(error, 'Company created, but the logo failed to upload -- add it from the company page.')
          navigate(`/admin/companies/${created.id}`, { replace: true })
          return
        } finally {
          setIsUploadingPendingLogo(false)
        }
      }

      showToast({ severity: 'success', summary: 'Company created' })
      navigate(`/admin/companies/${created.id}`, { replace: true })
    } catch (error) {
      showApiError(error)
    }
  }

  function confirmStatusToggle() {
    if (!company) return
    const activating = company.status === 'INACTIVE'
    confirmDialog({
      header: activating ? 'Activate company' : 'Deactivate company',
      message: activating
        ? `${company.name} will regain access to the platform.`
        : `${company.name} and its users will lose access to the platform. This can be reversed later.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: activating ? undefined : 'p-button-danger',
      accept: async () => {
        try {
          await setStatus.mutateAsync(activating)
          showToast({ severity: 'success', summary: activating ? 'Company activated' : 'Company deactivated' })
        } catch (error) {
          showApiError(error)
        }
      },
    })
  }

  async function handleLogoUpload(event: { files: File[] }) {
    const file = event.files[0]
    if (!file) return
    try {
      await uploadLogo.mutateAsync(file)
      showToast({ severity: 'success', summary: 'Logo updated' })
    } catch (error) {
      showApiError(error)
    }
  }

  if (isEdit && isLoadingCompany) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  const submitting = createCompany.isPending || updateCompany.isPending || isUploadingPendingLogo

  return (
    <div>
      <PageHeader
        title={isEdit ? company?.name ?? 'Company' : 'Add company'}
        subtitle={
          isEdit && company
            ? 'Update company details and manage status.'
            : 'Onboard a new corporate customer.'
        }
        backTo="/admin/companies"
        actions={isEdit && company ? <StatusBadge status={company.status} /> : undefined}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card title="Company details" className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Company name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <InputText id="name" {...field} className={errors.name ? 'p-invalid' : ''} placeholder="Acme Pharma" />
                )}
              />
              {errors.name && <small className="text-red-500 dark:text-red-400">{errors.name.message}</small>}
            </div>

            {isEdit && company && (
              <p className="text-xs text-text-muted">
                Onboarded on {format(new Date(company.createdAt), 'dd MMM yyyy, HH:mm')}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                label={isEdit ? 'Save changes' : isUploadingPendingLogo ? 'Uploading logo...' : 'Create company'}
                loading={submitting}
                disabled={isEdit && !isDirty}
              />
              {isEdit && company && (
                <Button
                  type="button"
                  label={company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  severity={company.status === 'ACTIVE' ? 'danger' : 'success'}
                  outlined
                  loading={setStatus.isPending}
                  onClick={confirmStatusToggle}
                />
              )}
              {isEdit && company && (
                <Button
                  type="button"
                  label="Users"
                  icon="pi pi-users"
                  outlined
                  onClick={() => navigate(`/admin/companies/${company.id}/users`)}
                />
              )}
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card title="Logo" subTitle={isEdit ? undefined : 'Optional -- add now, or come back after creating the company.'}>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {isEdit && company ? (
                <>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border text-xs text-text-muted">
                      No logo
                    </div>
                  )}
                  <FileUpload
                    mode="basic"
                    name="logo"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    maxFileSize={5_000_000}
                    customUpload
                    uploadHandler={handleLogoUpload}
                    auto
                    chooseLabel={uploadLogo.isPending ? 'Uploading...' : 'Upload logo'}
                    disabled={uploadLogo.isPending}
                  />
                </>
              ) : (
                <>
                  {pendingLogoPreview ? (
                    <img src={pendingLogoPreview} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border text-xs text-text-muted">
                      No logo
                    </div>
                  )}
                  <FileUpload
                    // Force a fresh instance if the user replaces their pick:
                    // PrimeReact's basic mode unmounts its native <input> after
                    // the first selection.
                    key={pendingLogo?.name ?? 'empty'}
                    mode="basic"
                    name="logo"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    maxFileSize={5_000_000}
                    chooseLabel={pendingLogo ? 'Replace logo' : 'Choose logo'}
                    onSelect={(event) => setPendingLogo(event.files[0] ?? null)}
                    disabled={submitting}
                  />
                </>
              )}
            </div>
          </Card>

          {isEdit && (
            <Card title="Company users" subTitle="Onboard users with designations and org-hierarchy placement.">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <i className="pi pi-info-circle mr-2" />
                User management isn't wired up on the backend yet — this section will let you add users with a name,
                email, designation, and org-unit placement as soon as that API ships.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
