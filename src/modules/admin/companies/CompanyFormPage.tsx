import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { confirmDialog } from 'primereact/confirmdialog'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Checkbox } from 'primereact/checkbox'
import { FileUpload } from 'primereact/fileupload'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Controller, useForm } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { uploadCompanyLogo } from '@/api/companies'
import type { CompanyFeatureKey } from '@/api/companyFeatureFlags'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCompany, useCreateCompany, useSetCompanyStatus, useUpdateCompany, useUploadCompanyLogo } from '@/hooks/useCompanies'
import { useCompanyFeatureFlags, useSetCompanyFeatureFlag } from '@/hooks/useCompanyFeatureFlags'
import { useAssignCompanyVendor, useCompanyVendors, useUnassignCompanyVendor } from '@/hooks/useCompanyVendors'
import { useVendors } from '@/hooks/useVendors'
import { showApiError, showToast } from '@/lib/toast'

/** Optional workflow changes this company has turned on -- off by default, so nothing changes for a company until they explicitly opt in. */
function FeatureFlagsCard({ companyId }: { companyId: string }) {
  const { data: flags, isLoading } = useCompanyFeatureFlags(companyId)
  const setFlag = useSetCompanyFeatureFlag(companyId)

  async function handleToggle(flagKey: CompanyFeatureKey, enabled: boolean) {
    try {
      await setFlag.mutateAsync({ flagKey, enabled })
      showToast({ severity: 'success', summary: enabled ? 'Feature enabled' : 'Feature disabled' })
    } catch (error) {
      showApiError(error)
    }
  }

  if (isLoading) {
    return (
      <Card title="Feature flags">
        <p className="text-sm text-text-muted">Loading...</p>
      </Card>
    )
  }

  return (
    <Card title="Feature flags" subTitle="Optional workflow changes -- off by default. Existing behavior is unaffected until turned on.">
      <div className="flex flex-col gap-4">
        {flags?.map((flag) => (
          <div key={flag.flagKey} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{flag.displayName}</p>
              <p className="text-xs text-text-muted">{flag.description}</p>
            </div>
            <InputSwitch checked={flag.enabled} onChange={(e) => handleToggle(flag.flagKey, e.value)} disabled={setFlag.isPending} />
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Which vendors this company sees in its Gift Store -- see GiftBrowseController/company_vendors. */
function VendorRosterCard({ companyId }: { companyId: string }) {
  const { data: allVendors, isLoading: loadingVendors } = useVendors()
  const { data: assigned, isLoading: loadingAssigned } = useCompanyVendors(companyId)
  const assignVendor = useAssignCompanyVendor(companyId)
  const unassignVendor = useUnassignCompanyVendor(companyId)

  const assignedIds = useMemo(() => new Set((assigned ?? []).map((v) => v.vendorId)), [assigned])

  async function handleToggle(vendorId: string, checked: boolean) {
    try {
      if (checked) {
        await assignVendor.mutateAsync(vendorId)
      } else {
        await unassignVendor.mutateAsync(vendorId)
      }
    } catch (error) {
      showApiError(error)
    }
  }

  if (loadingVendors || loadingAssigned) {
    return (
      <Card title="Vendors">
        <p className="text-sm text-text-muted">Loading...</p>
      </Card>
    )
  }

  return (
    <Card title="Vendors" subTitle="Only gifts from checked vendors appear in this company's Gift Store.">
      {!allVendors || allVendors.length === 0 ? (
        <p className="text-sm text-text-muted">No vendors onboarded yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {allVendors.map((vendor) => (
            <label key={vendor.id} className="flex items-center gap-2 text-sm text-text">
              <Checkbox
                checked={assignedIds.has(vendor.id)}
                onChange={(e) => handleToggle(vendor.id, e.checked ?? false)}
                disabled={assignVendor.isPending || unassignVendor.isPending}
              />
              {vendor.name}
              {vendor.status === 'SUSPENDED' && <span className="text-xs text-text-muted">(suspended)</span>}
            </label>
          ))}
        </div>
      )}
    </Card>
  )
}

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
          showApiError(error, 'Company created, but the logo failed to upload. Add it from the company page.')
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
          <Card title="Logo" subTitle={isEdit ? undefined : 'Optional. Add now, or come back after creating the company.'}>
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

          {isEdit && company && <VendorRosterCard companyId={company.id} />}
          {isEdit && company && <FeatureFlagsCard companyId={company.id} />}
        </div>
      </div>
    </div>
  )
}
