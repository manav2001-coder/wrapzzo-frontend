import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import type { Recipient } from '@/api/recipients'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCreateDoctorChangeRequest, useMyDoctorChangeRequests } from '@/hooks/useDoctorRequests'
import { useMyRecipients } from '@/hooks/useRecipients'
import { humanize, parseDateOnly } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

interface DoctorFormValues {
  name: string
  phone: string
  email: string
  address: string
  dob?: Date
}

const EMPTY_FORM: DoctorFormValues = { name: '', phone: '', email: '', address: '', dob: undefined }

/** Add/Edit a doctor -- submits a request, doesn't change anything directly. Approval by the MR's manager is what actually commits it. */
function DoctorRequestDialog({
  mode,
  target,
  visible,
  onHide,
}: {
  mode: 'ADD' | 'EDIT'
  target: Recipient | null
  visible: boolean
  onHide: () => void
}) {
  const createRequest = useCreateDoctorChangeRequest()
  // Lazy-initialized from props, once per mount -- the parent remounts this component (via a
  // `key` tied to the target) whenever it should open pre-filled for a different doctor,
  // rather than an effect syncing state after the fact.
  const [values, setValues] = useState<DoctorFormValues>(() =>
    mode === 'EDIT' && target
      ? {
          name: target.name,
          phone: target.phone,
          email: target.email ?? '',
          address: target.address ?? '',
          dob: target.dateOfBirth ? parseDateOnly(target.dateOfBirth) : undefined,
        }
      : EMPTY_FORM,
  )

  function handleHide() {
    setValues(EMPTY_FORM)
    onHide()
  }

  async function handleSubmit() {
    try {
      await createRequest.mutateAsync({
        action: mode,
        recipientId: mode === 'EDIT' ? (target?.id ?? undefined) : undefined,
        proposedName: values.name.trim() || undefined,
        proposedPhone: values.phone.trim() || undefined,
        proposedEmail: values.email.trim() || undefined,
        proposedAddress: values.address.trim() || undefined,
        proposedDob: values.dob ? format(values.dob, 'yyyy-MM-dd') : undefined,
      })
      showToast({
        severity: 'success',
        summary: 'Request sent',
        detail: "Sent to your manager for approval -- it'll show up on your list once approved.",
      })
      handleHide()
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <Dialog
      header={mode === 'ADD' ? 'Request a new doctor' : `Request changes -- ${target?.name}`}
      visible={visible}
      onHide={handleHide}
      style={{ width: '28rem' }}
      modal
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Doctor name</label>
          <InputText value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Phone</label>
          <InputText value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Email (optional)</label>
          <InputText value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Clinic / address (optional)</label>
          <InputText value={values.address} onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Date of birth (optional)</label>
          <Calendar value={values.dob ?? null} onChange={(e) => setValues((v) => ({ ...v, dob: (e.value as Date) ?? undefined }))} dateFormat="dd M yy" showIcon />
        </div>
        <Button
          label="Send for approval"
          icon="pi pi-send"
          loading={createRequest.isPending}
          disabled={!values.name.trim() || !values.phone.trim()}
          onClick={handleSubmit}
        />
      </div>
    </Dialog>
  )
}

export function MyDoctorsPage() {
  const { data: doctors, isLoading } = useMyRecipients()
  const { data: myRequests } = useMyDoctorChangeRequests()
  const createRequest = useCreateDoctorChangeRequest()

  const [addVisible, setAddVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<Recipient | null>(null)

  const pendingRequests = (myRequests ?? []).filter((r) => r.status === 'PENDING')

  async function handleRequestRemove(doctor: Recipient) {
    try {
      await createRequest.mutateAsync({ action: 'REMOVE', recipientId: doctor.id })
      showToast({ severity: 'success', summary: 'Removal requested', detail: "Sent to your manager -- they'll still be in the shared directory either way." })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div>
      <PageHeader
        title="My Doctors"
        subtitle="Your own list -- add, edit, or remove a doctor from it. Changes go to your manager for approval first."
        actions={<Button label="Request new doctor" icon="pi pi-plus" onClick={() => setAddVisible(true)} />}
      />

      {!isLoading && (doctors ?? []).length === 0 ? (
        <EmptyState
          icon="pi-users"
          title="No doctors on your list yet"
          description="Request your first one -- it'll appear here once your manager approves it."
          action={<Button label="Request new doctor" icon="pi pi-plus" onClick={() => setAddVisible(true)} />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {doctors?.map((doctor) => (
            <div key={doctor.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="min-w-0">
                <p className="font-medium text-text">{doctor.name}</p>
                <p className="text-xs text-text-muted">
                  {doctor.phone}
                  {doctor.email ? ` · ${doctor.email}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button icon="pi pi-pencil" text aria-label="Request edit" onClick={() => setEditTarget(doctor)} />
                <Button icon="pi pi-trash" text severity="danger" aria-label="Request removal" onClick={() => handleRequestRemove(doctor)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="mt-8">
          <SectionHeader eyebrow={`${pendingRequests.length} pending`} title="Your requests awaiting approval" />
          <div className="flex flex-col gap-2">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-dashed border-border p-3 text-sm">
                <span className="text-text">
                  <span className="font-medium">{humanize(r.action)}</span> -- {r.proposedName ?? r.recipientName}
                </span>
                <StatusBadge status={r.status} label={humanize(r.status)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <DoctorRequestDialog key={addVisible ? 'add-open' : 'add-closed'} mode="ADD" target={null} visible={addVisible} onHide={() => setAddVisible(false)} />
      <DoctorRequestDialog
        key={editTarget?.id ?? 'edit-closed'}
        mode="EDIT"
        target={editTarget}
        visible={editTarget !== null}
        onHide={() => setEditTarget(null)}
      />
    </div>
  )
}
