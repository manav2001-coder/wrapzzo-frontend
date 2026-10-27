import type { ColumnDef } from '@tanstack/react-table'
import { Hourglass, Pencil, Stethoscope, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { DoctorChangeStatus } from '@/api/doctorRequests'
import type { Recipient } from '@/api/recipients'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { DatePicker } from '@/components/fields/date-picker'
import { LabelledField } from '@/components/fields/labelled-field'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateDoctorChangeRequest, useMyDoctorChangeRequests } from '@/hooks/useDoctorRequests'
import { useMyRecipients } from '@/hooks/useRecipients'
import { formatDateTime, fromDateOnly, toDateOnly } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'

const LIST_FIELDS: ListFieldMap = { name: 'text', phone: 'text', email: 'text', registrationNumber: 'text' }

const STATUS_VARIANT: Record<DoctorChangeStatus, BadgeProps['variant']> = {
  PENDING: 'warning-soft',
  APPROVED: 'success-soft',
  REJECTED: 'destructive-soft',
}

interface Draft {
  name: string
  phone: string
  email: string
  address: string
  dob: Date | null
}

/**
 * Add or edit a doctor -- this files a request; nothing changes until the MR's manager approves
 * it. The parent remounts it per target (`key`), so it starts from that doctor's values.
 */
function DoctorRequestDialog({ target, onClose }: { target: Recipient | null; onClose: () => void }) {
  const { t } = useTranslation('recipients')
  const showError = useApiErrorToast()
  const createRequest = useCreateDoctorChangeRequest()
  const [draft, setDraft] = useState<Draft>(() => ({
    name: target?.name ?? '',
    phone: target?.phone ?? '',
    email: target?.email ?? '',
    address: target?.address ?? '',
    dob: fromDateOnly(target?.dateOfBirth) ?? null,
  }))
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  async function submit() {
    try {
      await createRequest.mutateAsync({
        action: target ? 'EDIT' : 'ADD',
        recipientId: target?.id,
        proposedName: draft.name.trim() || undefined,
        proposedPhone: draft.phone.trim() || undefined,
        proposedEmail: draft.email.trim() || undefined,
        proposedAddress: draft.address.trim() || undefined,
        proposedDob: toDateOnly(draft.dob) ?? undefined,
      })
      toast.success(t('doctors.sent'))
      onClose()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title={target ? t('doctors.editTitle', { name: target.name }) : t('doctors.addTitle')}
      confirmLabel={t('doctors.send')}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      confirmDisabled={!draft.name.trim() || !draft.phone.trim()}
      loading={createRequest.isPending}
      onConfirm={() => void submit()}
    >
      <div className="space-y-3">
        <LabelledField id="doctor-name" label={`${t('field.doctorName')} *`}>
          <Input id="doctor-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </LabelledField>
        <LabelledField id="doctor-phone" label={`${t('field.phone')} *`}>
          <Input id="doctor-phone" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
        </LabelledField>
        <LabelledField id="doctor-email" label={t('field.email')}>
          <Input id="doctor-email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
        </LabelledField>
        <LabelledField id="doctor-address" label={t('field.clinicAddress')}>
          <Input id="doctor-address" value={draft.address} onChange={(e) => set({ address: e.target.value })} />
        </LabelledField>
        <LabelledField id="doctor-dob" label={t('field.dob')}>
          <DatePicker id="doctor-dob" value={draft.dob} onChange={(value) => set({ dob: value })} toDate={new Date()} />
        </LabelledField>
      </div>
    </AppDialog>
  )
}

/** An MR's own doctor list; every add, edit or removal is a request their manager approves. */
export function MyDoctorsPage() {
  const { t } = useTranslation('recipients')
  const showError = useApiErrorToast()
  const { data: doctors, isLoading, error, refetch } = useMyRecipients()
  const { data: requests } = useMyDoctorChangeRequests()
  const createRequest = useCreateDoctorChangeRequest()
  // `undefined` = closed, `null` = requesting a new doctor, a doctor = requesting changes to them.
  const [editing, setEditing] = useState<Recipient | null | undefined>(undefined)
  const [removing, setRemoving] = useState<Recipient | null>(null)

  const pending = (requests ?? []).filter((r) => r.status === 'PENDING')

  async function confirmRemove() {
    if (!removing) return
    try {
      await createRequest.mutateAsync({ action: 'REMOVE', recipientId: removing.id })
      toast.success(t('doctors.removeSent'))
    } catch (err) {
      showError(err)
    } finally {
      setRemoving(null)
    }
  }

  const columns = useMemo<ColumnDef<Recipient, unknown>[]>(
    () => [
      { id: 'name', accessorKey: 'name', header: t('field.doctorName'), meta: { className: 'min-w-[180px]', align: 'left' } },
      {
        id: 'registrationNumber',
        accessorFn: (r) => r.doctor?.registrationNumber ?? '',
        header: t('field.registrationNumber'),
        meta: { className: 'min-w-[130px]' },
      },
      {
        id: 'speciality',
        accessorFn: (r) => r.doctor?.speciality ?? '',
        header: t('field.speciality'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[130px]' },
      },
      { id: 'phone', accessorKey: 'phone', header: t('field.phone'), meta: { className: 'min-w-[130px]' } },
      { id: 'email', accessorFn: (r) => r.email ?? '', header: t('field.email'), meta: { className: 'min-w-[180px]' } },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[96px]', pin: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            <IconButton icon={Pencil} label={t('doctors.requestEdit', { name: row.original.name })} onClick={() => setEditing(row.original)} />
            <IconButton
              icon={Trash2}
              tone="destructive"
              label={t('doctors.requestRemove', { name: row.original.name })}
              onClick={() => setRemoving(row.original)}
            />
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-4">
      <MasterPageHeader
        title={t('doctors.title')}
        description={t('doctors.subtitle')}
        createLabel={t('doctors.request')}
        onCreate={() => setEditing(null)}
      />

      {pending.length > 0 && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-warning" />
              {t('doctors.pendingTitle')}
            </span>
          }
        >
          <ul className="space-y-2">
            {pending.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{t(`doctors.action.${request.action}`)}</span> · {request.proposedName ?? request.recipientName}
                  <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</span>
                </span>
                <Badge variant={STATUS_VARIANT[request.status]}>{t(`doctors.status.${request.status}`)}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <DataTable<Recipient>
        columns={columns}
        data={doctors ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        getRowId={(r) => r.id}
        tableId="my-doctors"
        configNamespace="my-doctors"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Stethoscope className="h-8 w-8 opacity-50" />,
          message: t('doctors.emptyTitle'),
          description: t('doctors.emptyBody'),
        })}
      />

      {editing !== undefined && <DoctorRequestDialog key={editing?.id ?? 'new'} target={editing} onClose={() => setEditing(undefined)} />}
      <AppDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        size="sm"
        title={removing ? t('doctors.removeTitle', { name: removing.name }) : ''}
        description={t('doctors.removeBody')}
        confirmLabel={t('doctors.removeConfirm')}
        confirmVariant="destructive"
        cancelLabel={t('action.cancel', { ns: 'common' })}
        loading={createRequest.isPending}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  )
}
