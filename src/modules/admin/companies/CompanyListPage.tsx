import type { ColumnDef } from '@tanstack/react-table'
import { Building2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { uploadCompanyLogo, type Company, type CompanyInput } from '@/api/companies'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { FormGenerator, type FormGeneratorHandle } from '@/components/fields/form-generator'
import { sectionField } from '@/components/fields/form-section'
import { FileDropzone } from '@/components/file-dropzone'
import { emailField, phoneField, textField } from '@/components/masters/master-fields'
import { MasterDrawer } from '@/components/masters/master-drawer'
import { MasterPageHeader, useMasterColumns } from '@/components/masters/master-page'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanies, useCreateCompany, useSetCompanyStatus, useUpdateCompany } from '@/hooks/useCompanies'
import type { ListFieldMap } from '@/lib/list-fields'
import { rowsFetcher } from '@/lib/masters-api'
import { P } from '@/lib/permissions'
import { CompanyAvatar } from './CompanyAvatar'
import { CompanyFeaturesPanel } from './CompanyFeaturesPanel'

const LIST_FIELDS: ListFieldMap = { name: 'text', displayId: 'text', contactPersonName: 'text', city: 'text', gstin: 'text', addedOn: 'date', addedByName: 'text', updatedOn: 'date', updatedByName: 'text' }

const LOGO_ACCEPT = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'image/svg+xml': ['.svg'] }

const text = (value: unknown) => String(value ?? '').trim()

/**
 * Companies, as MobixFL onboards a franchise: a table, and onboarding or editing in a side drawer
 * so the list keeps its place -- a logo, the company's name (its id is issued, never chosen), who
 * to contact, its tax and registration ids, where it is, and notes. The drawer follows the URL
 * . Which workflow changes a company has opted
 * into sit under the form once it exists. Vendors are not part of onboarding: which vendors serve
 * a company is set on the Vendors screen.
 */
export function CompanyListPage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const { data: companies, dataUpdatedAt, error, refetch } = useCompanies()
  const fetchCompanies = useMemo(() => rowsFetcher(companies ?? [], (company: Company) => company.status === 'ACTIVE'), [companies])
  const createCompany = useCreateCompany()
  const setStatus = useSetCompanyStatus()
  const [handle, setHandle] = useState<FormGeneratorHandle | null>(null)

  // The drawer is state, not a route (as in MobixFL): 'new' to onboard, a company's id to edit it.
  const [drawer, setDrawer] = useState<'new' | string | null>(null)
  const creating = drawer === 'new'
  const editing = drawer && !creating ? companies?.find((company) => company.id === drawer) : undefined
  const drawerOpen = creating || Boolean(editing)
  const closeDrawer = () => setDrawer(null)
  const updateCompany = useUpdateCompany(editing?.id ?? '')

  // The company needs an id before the logo has anywhere to go, so a pick made while creating is
  // held here and uploaded right after the create.
  const [pendingLogo, setPendingLogo] = useState<File | null>(null)
  const pendingPreview = useMemo(() => (pendingLogo ? URL.createObjectURL(pendingLogo) : null), [pendingLogo])
  useEffect(() => () => void (pendingPreview && URL.revokeObjectURL(pendingPreview)), [pendingPreview])
  useEffect(() => {
    if (!drawerOpen) setPendingLogo(null)
  }, [drawerOpen])

  async function changeStatus(company: Company, active: boolean) {
    try {
      await setStatus.mutateAsync({ id: company.id, active })
      toast.success(active ? t('companies.activated') : t('companies.deactivated'))
    } catch (err) {
      showError(err)
    }
  }

  const { statusColumn, actionsColumn, auditColumns, deactivateDialog } = useMasterColumns<Company>({
    isActive: (company) => company.status === 'ACTIVE',
    onEdit: (company) => setDrawer(company.id),
    onActivate: (company) => changeStatus(company, true),
    onDeactivate: (company) => changeStatus(company, false),
    editPermission: P.PLATFORM_COMPANY_STATUS,
    deletePermission: P.PLATFORM_COMPANY_STATUS,
    deactivateCopy: {
      label: t('action.deactivate', { ns: 'common' }),
      title: t('companies.deactivateTitle'),
      body: t('companies.deactivateBody'),
    },
  })

  const columns = useMemo<ColumnDef<Company, unknown>[]>(
    () => [
      {
        id: 'logoUrl',
        header: t('companies.column.logo'),
        enableSorting: false,
        enableColumnFilter: false,
        meta: { className: 'w-[72px] min-w-[72px]' },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <CompanyAvatar company={row.original} />
          </div>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: t('companies.column.company'),
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) => (
          <button type="button" className="truncate font-medium hover:underline" onClick={() => setDrawer(row.original.id)}>
            {row.original.name}
          </button>
        ),
      },
      { id: 'displayId', accessorKey: 'displayId', header: t('companies.column.id'), meta: { className: 'min-w-[110px]' } },
      { id: 'contactPersonName', accessorFn: (c) => c.contactPersonName ?? '', header: t('companies.column.contact'), meta: { className: 'min-w-[160px]' } },
      { id: 'city', accessorFn: (c) => c.city ?? '', header: t('companies.column.city'), meta: { className: 'min-w-[120px]' } },
      { id: 'gstin', accessorFn: (c) => c.gstin ?? '', header: t('companies.column.gstin'), meta: { className: 'min-w-[160px]' }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.gstin ?? '-'}</span> },
      statusColumn,
      ...auditColumns,
      actionsColumn,
    ],
    [t, statusColumn, auditColumns, actionsColumn],
  )

  const fields = useMemo(
    () => [
      // The code is issued, so it only shows once the company exists, and never changes.
      textField({ id: 'displayId', label: t('companies.drawer.code'), lockedForEdit: true, hidden: () => creating, description: t('companies.drawer.codeHelp') }),
      textField({ id: 'name', label: t('companies.drawer.name'), placeholder: t('companies.drawer.namePlaceholder'), required: true, max: 160, spanToFullRow: creating }),
      sectionField('__contact', t('companies.drawer.sections.contact')),
      textField({ id: 'contactPersonName', label: t('companies.drawer.contactPerson'), max: 160 }),
      emailField({ id: 'contactEmail', label: t('companies.drawer.contactEmail') }),
      phoneField({ id: 'contactMobile', label: t('companies.drawer.contactMobile') }),
      sectionField('__compliance', t('companies.drawer.sections.compliance')),
      textField({ id: 'gstin', label: t('companies.drawer.gstin'), max: 15, placeholder: '27ABCDE1234F1Z5' }),
      textField({ id: 'pan', label: t('companies.drawer.pan'), max: 10, placeholder: 'ABCDE1234F' }),
      textField({ id: 'registrationNumber', label: t('companies.drawer.registrationNumber'), max: 60, description: t('companies.drawer.registrationNumberHelp') }),
      sectionField('__address', t('companies.drawer.sections.address')),
      textField({ id: 'addressLine1', label: t('companies.drawer.addressLine1'), max: 200, spanToFullRow: true }),
      textField({ id: 'addressLine2', label: t('companies.drawer.addressLine2'), max: 200, spanToFullRow: true }),
      textField({ id: 'city', label: t('companies.drawer.city'), max: 100 }),
      textField({ id: 'state', label: t('companies.drawer.state'), max: 100 }),
      textField({ id: 'pincode', label: t('companies.drawer.pincode'), max: 6, placeholder: '411001' }),
      sectionField('__notes', t('companies.drawer.sections.notes')),
      textField({ id: 'notes', label: t('companies.drawer.notes'), max: 2000, multiline: true, spanToFullRow: true }),
    ],
    [t, creating],
  )

  const values = useMemo(
    () =>
      editing
        ? {
            displayId: editing.displayId,
            name: editing.name,
            contactPersonName: editing.contactPersonName ?? '',
            contactEmail: editing.contactEmail ?? '',
            contactMobile: editing.contactMobile ?? '',
            gstin: editing.gstin ?? '',
            pan: editing.pan ?? '',
            registrationNumber: editing.registrationNumber ?? '',
            addressLine1: editing.addressLine1 ?? '',
            addressLine2: editing.addressLine2 ?? '',
            city: editing.city ?? '',
            state: editing.state ?? '',
            pincode: editing.pincode ?? '',
            notes: editing.notes ?? '',
          }
        : undefined,
    [editing],
  )

  async function onSubmit(submitted: Record<string, unknown>) {
    const input: CompanyInput = {
      name: text(submitted.name),
      contactPersonName: text(submitted.contactPersonName),
      contactEmail: text(submitted.contactEmail),
      contactMobile: text(submitted.contactMobile),
      gstin: text(submitted.gstin).toUpperCase(),
      pan: text(submitted.pan).toUpperCase(),
      registrationNumber: text(submitted.registrationNumber),
      addressLine1: text(submitted.addressLine1),
      addressLine2: text(submitted.addressLine2),
      city: text(submitted.city),
      state: text(submitted.state),
      pincode: text(submitted.pincode),
      notes: text(submitted.notes),
    }
    try {
      if (editing) {
        await updateCompany.mutateAsync(input)
        toast.success(t('companies.drawer.updated'))
      } else {
        const created = await createCompany.mutateAsync(input)
        if (pendingLogo) {
          try {
            await uploadCompanyLogo(created.id, pendingLogo)
          } catch (error) {
            showError(error, t('companies.drawer.logoFailedAfterCreate'))
          }
        }
        toast.success(t('companies.drawer.created', { name: created.name }))
      }
      closeDrawer()
    } catch (err) {
      showError(err)
    }
  }

  async function onLogoPicked(file: File | null) {
    if (!file) return
    if (!editing) {
      setPendingLogo(file)
      return
    }
    try {
      await uploadCompanyLogo(editing.id, file)
      await refetch()
      toast.success(t('companies.drawer.logoUploaded'))
    } catch (err) {
      showError(err)
    }
  }

  return (
    <div>
      <MasterPageHeader
        title={t('companies.title')}
        description={t('companies.subtitle')}
        createLabel={t('companies.add')}
        createPermission={P.PLATFORM_COMPANY_CREATE}
        onCreate={() => setDrawer('new')}
      />
      <DataTable<Company>
        columns={columns}
        fetchData={fetchCompanies}
        refreshTrigger={dataUpdatedAt}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        tableId="admin-companies"
        configNamespace="admin-companies"
        getRowId={(company) => company.id}
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Building2 className="h-8 w-8 opacity-50" />,
          message: t('companies.emptyTitle'),
          description: t('companies.emptyBody'),
        })}
      />
      <MasterDrawer
        open={drawerOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        title={creating ? t('companies.drawer.newTitle') : t('companies.drawer.editTitle')}
        description={creating ? t('companies.drawer.newDescription') : editing?.name}
        submitLabel={creating ? t('companies.drawer.create') : undefined}
        handle={handle}
      >
        {drawerOpen && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {editing?.logoUrl || pendingPreview ? (
                <img src={editing?.logoUrl ?? pendingPreview ?? undefined} alt="" className="h-16 w-16 shrink-0 rounded-lg border object-cover" />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  {t('companies.drawer.noLogo')}
                </div>
              )}
              <FileDropzone
                file={editing ? null : pendingLogo}
                onChange={(file) => void onLogoPicked(file)}
                accept={LOGO_ACCEPT}
                prompt={t('companies.drawer.logoDrop')}
                className="min-w-0 flex-1"
              />
            </div>
            <FormGenerator
              key={drawer}
              fields={fields}
              values={values}
              mode={creating ? 'create' : 'edit'}
              maxWidgetsPerRow={2}
              submitPermission={creating ? P.PLATFORM_COMPANY_CREATE : P.PLATFORM_COMPANY_EDIT}
              onSubmit={onSubmit}
              onReady={setHandle}
              hideCardWrapper
              hideSubmitButton
            />
            {editing && <CompanyFeaturesPanel companyId={editing.id} />}
          </div>
        )}
      </MasterDrawer>
      {deactivateDialog}
    </div>
  )
}
