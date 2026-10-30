import { ArrowLeft, Power, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { uploadCompanyLogo } from '@/api/companies'
import type { CompanyFeatureKey } from '@/api/companyFeatureFlags'
import { AppDialog } from '@/components/app-dialog'
import { CheckboxField } from '@/components/fields/checkbox-field'
import { FormGenerator } from '@/components/fields/form-generator'
import { SwitchField } from '@/components/fields/switch-field'
import { ToggleGroupField } from '@/components/fields/toggle-group-field'
import { FileDropzone } from '@/components/file-dropzone'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { textField } from '@/components/masters/master-fields'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompany, useCreateCompany, useSetCompanyStatus, useUpdateCompany, useUploadCompanyLogo } from '@/hooks/useCompanies'
import {
  useArtworkApprovalLevels,
  useCompanyFeatureFlags,
  useSetArtworkApprovalLevels,
  useSetCompanyFeatureFlag,
} from '@/hooks/useCompanyFeatureFlags'
import { useAssignCompanyVendor, useCompanyVendors, useUnassignCompanyVendor } from '@/hooks/useCompanyVendors'
import { useVendors } from '@/hooks/useVendors'
import { formatDate } from '@/lib/datetime'
import { CompanyAvatar } from './CompanyAvatar'
import { P } from '@/lib/permissions'

const LOGO_ACCEPT = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'image/svg+xml': ['.svg'] }

const LEVEL_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))

/** How many managers above the MR approve artwork (Senior Artwork Approval): 1 = just their manager. */
function ArtworkApprovalLevelsField({ companyId }: { companyId: string }) {
  const { t } = useTranslation('admin')
  const { data: levels } = useArtworkApprovalLevels(companyId)
  const setLevels = useSetArtworkApprovalLevels(companyId)
  const showError = useApiErrorToast()

  async function change(value: string | string[]) {
    const next = Number(Array.isArray(value) ? value[0] : value)
    if (!next || next === levels) return
    try {
      await setLevels.mutateAsync(next)
      toast.success(t('companies.detail.approvalLevelsSaved', { count: next }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="ml-1 border-l-2 pl-4">
      <ToggleGroupField
        label={t('companies.detail.approvalLevels')}
        helperText={t('companies.detail.approvalLevelsHelp')}
        options={LEVEL_OPTIONS}
        exclusive
        value={levels ? String(levels) : ''}
        disabled={levels === undefined || setLevels.isPending}
        onValueChange={(value) => void change(value)}
      />
    </div>
  )
}

/** Optional workflow changes this company has turned on -- off by default, so nothing changes until a company opts in. */
function FeatureFlagsCard({ companyId }: { companyId: string }) {
  const { t } = useTranslation('admin')
  const { data: flags, isLoading } = useCompanyFeatureFlags(companyId)
  const setFlag = useSetCompanyFeatureFlag(companyId)
  const showError = useApiErrorToast()

  async function toggle(flagKey: CompanyFeatureKey, enabled: boolean) {
    try {
      await setFlag.mutateAsync({ flagKey, enabled })
      toast.success(enabled ? t('companies.detail.featureEnabled') : t('companies.detail.featureDisabled'))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <SectionCard title={t('companies.detail.features')} description={t('companies.detail.featuresHelp')} loading={isLoading}>
      <div className="space-y-4">
        {flags?.map((flag) => (
          <div key={flag.flagKey} className="space-y-3">
            <SwitchField
              label={flag.displayName}
              helperText={flag.description}
              checked={flag.enabled}
              disabled={setFlag.isPending}
              onCheckedChange={(enabled) => void toggle(flag.flagKey, enabled)}
            />
            {flag.flagKey === 'MARKETING_DESIGN_APPROVAL' && flag.enabled && <ArtworkApprovalLevelsField companyId={companyId} />}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/** Which vendors this company sees in its Gift Store (company_vendors). */
function VendorRosterCard({ companyId }: { companyId: string }) {
  const { t } = useTranslation('admin')
  const { data: allVendors, isLoading: loadingVendors } = useVendors()
  const { data: assigned, isLoading: loadingAssigned } = useCompanyVendors(companyId)
  const assignVendor = useAssignCompanyVendor(companyId)
  const unassignVendor = useUnassignCompanyVendor(companyId)
  const showError = useApiErrorToast()
  const assignedIds = useMemo(() => new Set((assigned ?? []).map((v) => v.vendorId)), [assigned])
  const busy = assignVendor.isPending || unassignVendor.isPending

  async function toggle(vendorId: string, checked: boolean) {
    try {
      await (checked ? assignVendor.mutateAsync(vendorId) : unassignVendor.mutateAsync(vendorId))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <SectionCard
      title={t('companies.detail.vendors')}
      description={t('companies.detail.vendorsHelp')}
      loading={loadingVendors || loadingAssigned}
    >
      {!allVendors?.length ? (
        <p className="text-sm text-muted-foreground">{t('companies.detail.noVendors')}</p>
      ) : (
        <div className="space-y-2">
          {allVendors.map((vendor) => (
            <CheckboxField
              key={vendor.id}
              label={
                <span className="flex items-center gap-2">
                  {vendor.name}
                  {vendor.status === 'SUSPENDED' && (
                    <span className="text-xs text-muted-foreground">({t('companies.detail.suspended')})</span>
                  )}
                </span>
              }
              checked={assignedIds.has(vendor.id)}
              disabled={busy}
              onCheckedChange={(checked) => void toggle(vendor.id, checked)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export function CompanyFormPage() {
  const { t } = useTranslation('admin')
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const showError = useApiErrorToast()

  const { data: company, isLoading } = useCompany(id)
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany(id ?? '')
  const setStatus = useSetCompanyStatus()
  const uploadLogo = useUploadCompanyLogo(id ?? '')
  const [confirmingStatus, setConfirmingStatus] = useState(false)

  // Create mode only: a company needs an id before the backend's presign/attach endpoints have
  // anywhere to put a logo, so the pick is held here and uploaded right after the create.
  const [pendingLogo, setPendingLogo] = useState<File | null>(null)
  const pendingPreview = useMemo(() => (pendingLogo ? URL.createObjectURL(pendingLogo) : null), [pendingLogo])
  useEffect(() => () => void (pendingPreview && URL.revokeObjectURL(pendingPreview)), [pendingPreview])

  const fields = useMemo(
    () => [textField({ id: 'name', label: t('companies.detail.name'), placeholder: t('companies.detail.namePlaceholder'), required: true })],
    [t],
  )
  const values = useMemo(() => (company ? { name: company.name } : undefined), [company])

  async function onSubmit(submitted: Record<string, unknown>) {
    const name = String(submitted.name).trim()
    try {
      if (isEdit) {
        await updateCompany.mutateAsync(name)
        toast.success(t('companies.detail.updated'))
        return
      }
      const created = await createCompany.mutateAsync(name)
      if (pendingLogo) {
        try {
          await uploadCompanyLogo(created.id, pendingLogo)
        } catch {
          toast.error(t('companies.detail.logoFailedAfterCreate'))
        }
      }
      toast.success(t('companies.detail.created'))
      navigate(`/admin/companies/${created.id}`, { replace: true })
    } catch (error) {
      showError(error)
    }
  }

  async function onLogoPicked(file: File | null) {
    if (!file) return
    if (!isEdit) {
      setPendingLogo(file)
      return
    }
    try {
      await uploadLogo.mutateAsync(file)
      toast.success(t('companies.detail.logoUploaded'))
    } catch (error) {
      showError(error)
    }
  }

  async function confirmStatus() {
    if (!company) return
    const activating = company.status !== 'ACTIVE'
    try {
      await setStatus.mutateAsync({ id: company.id, active: activating })
      toast.success(activating ? t('companies.activated') : t('companies.deactivated'))
    } catch (error) {
      showError(error)
    } finally {
      setConfirmingStatus(false)
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const active = company?.status === 'ACTIVE'

  return (
    <div className="space-y-6">
      <MasterPageHeader
        lead={
          <>
            <IconButton icon={ArrowLeft} label={t('companies.detail.back')} onClick={() => navigate('/admin/companies')} />
            {company && <CompanyAvatar company={company} size={36} />}
          </>
        }
        title={isEdit ? (company?.name ?? '') : t('companies.detail.newTitle')}
        description={isEdit ? t('companies.detail.editSubtitle') : t('companies.detail.newSubtitle')}
        extra={
          company && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusCell active={active} />
              <Button size="sm" variant={active ? 'outline' : 'default'} onClick={() => setConfirmingStatus(true)}>
                {active ? <Power /> : <RotateCcw />}
                {active ? t('action.deactivate', { ns: 'common' }) : t('action.activate', { ns: 'common' })}
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 pb-4 lg:grid-cols-3">
        <SectionCard
          title={t('companies.detail.details')}
          className="lg:col-span-2"
          footer={
            company && (
              <span className="text-xs text-muted-foreground">
                {t('companies.detail.onboardedOn', { date: formatDate(company.createdAt) })}
              </span>
            )
          }
        >
          <FormGenerator
            fields={fields}
            values={values}
            mode={isEdit ? 'edit' : 'create'}
            maxWidgetsPerRow={1}
            submitPermission={isEdit ? P.PLATFORM_COMPANY_EDIT : P.PLATFORM_COMPANY_CREATE}
            submitLabel={isEdit ? t('companies.detail.save') : t('companies.detail.create')}
            onSubmit={onSubmit}
            hideCardWrapper
          />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard
            title={t('companies.detail.logo')}
            description={isEdit ? t('companies.detail.logoHelp') : t('companies.detail.logoHelpNew')}
          >
            <div className="flex items-center gap-4">
              {company?.logoUrl || pendingPreview ? (
                <img
                  src={company?.logoUrl ?? pendingPreview ?? undefined}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  {t('companies.detail.noLogo')}
                </div>
              )}
              <FileDropzone
                file={isEdit ? null : pendingLogo}
                onChange={(file) => void onLogoPicked(file)}
                accept={LOGO_ACCEPT}
                disabled={uploadLogo.isPending}
                prompt={t('companies.detail.logoDrop')}
                className="min-w-0 flex-1"
              />
            </div>
          </SectionCard>

          {company && <VendorRosterCard companyId={company.id} />}
          {company && <FeatureFlagsCard companyId={company.id} />}
        </div>
      </div>

      {company && (
        <AppDialog
          open={confirmingStatus}
          onOpenChange={setConfirmingStatus}
          size="sm"
          title={active ? t('companies.deactivateTitle') : t('action.activate', { ns: 'common' })}
          description={active ? t('companies.deactivateBody') : undefined}
          confirmLabel={active ? t('action.deactivate', { ns: 'common' }) : t('action.activate', { ns: 'common' })}
          cancelLabel={t('action.cancel', { ns: 'common' })}
          confirmVariant={active ? 'destructive' : 'default'}
          loading={setStatus.isPending}
          onConfirm={confirmStatus}
        />
      )}
    </div>
  )
}
