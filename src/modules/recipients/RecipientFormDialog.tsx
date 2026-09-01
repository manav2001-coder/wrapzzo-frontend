import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useState } from 'react'
import type { Recipient } from '@/api/recipients'
import { useCreateRecipient, useUpdateRecipient } from '@/hooks/useRecipients'
import { parseDateOnly } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

interface DraftRecipient {
  name: string
  phone: string
  email: string
  address: string
  dateOfBirth?: Date
}

const EMPTY: DraftRecipient = { name: '', phone: '', email: '', address: '', dateOfBirth: undefined }

function draftFrom(recipient: Recipient): DraftRecipient {
  return {
    name: recipient.name,
    phone: recipient.phone,
    email: recipient.email ?? '',
    address: recipient.address ?? '',
    dateOfBirth: recipient.dateOfBirth ? parseDateOnly(recipient.dateOfBirth) : undefined,
  }
}

/** Add mode with no `recipient`, edit mode with one -- e.g. to fill in a Date of Birth on a recipient that came in via Quick Gift/a submission without one. */
export function RecipientFormDialog({ visible, onHide, recipient }: { visible: boolean; onHide: () => void; recipient?: Recipient | null }) {
  const [draft, setDraft] = useState<DraftRecipient>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient()
  const isEdit = Boolean(recipient)

  function handleShow() {
    setDraft(recipient ? draftFrom(recipient) : EMPTY)
    setErrors({})
  }

  function handleHide() {
    onHide()
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {}
    if (!draft.name.trim()) nextErrors.name = 'Required.'
    if (!draft.phone.trim()) nextErrors.phone = 'Required.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim() || undefined,
      address: draft.address.trim() || undefined,
      dateOfBirth: draft.dateOfBirth ? format(draft.dateOfBirth, 'yyyy-MM-dd') : undefined,
    }

    try {
      if (isEdit && recipient) {
        await updateRecipient.mutateAsync({ id: recipient.id, input })
        showToast({ severity: 'success', summary: 'Recipient updated' })
      } else {
        await createRecipient.mutateAsync(input)
        showToast({ severity: 'success', summary: 'Recipient added' })
      }
      handleHide()
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <Dialog
      header={isEdit ? 'Edit recipient' : 'Add recipient'}
      visible={visible}
      onShow={handleShow}
      onHide={handleHide}
      style={{ width: '32rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      modal
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Name *</label>
          <InputText
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className={`w-full ${errors.name ? 'p-invalid' : ''}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Phone *</label>
            <InputText
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              className={`w-full ${errors.phone ? 'p-invalid' : ''}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Date of birth</label>
            <Calendar
              value={draft.dateOfBirth}
              onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: (e.value as Date) ?? undefined }))}
              dateFormat="dd M yy"
              showIcon
              className="w-full"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Email</label>
          <InputText value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Address</label>
          <InputTextarea value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} rows={2} className="w-full" />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button label="Cancel" text onClick={handleHide} />
        <Button
          label={isEdit ? 'Save changes' : 'Add recipient'}
          loading={createRecipient.isPending || updateRecipient.isPending}
          onClick={handleSubmit}
        />
      </div>
    </Dialog>
  )
}
