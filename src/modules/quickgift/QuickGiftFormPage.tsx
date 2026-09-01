import { format } from 'date-fns'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { FileUpload } from 'primereact/fileupload'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { uploadQuickGiftPhoto, type QuickGiftPhotoValue } from '@/api/quickGifts'
import type { Recipient, UpcomingBirthday } from '@/api/recipients'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useActiveGifts } from '@/hooks/useGifts'
import { useCreateQuickGiftRequest } from '@/hooks/useQuickGifts'
import { parseDateOnly } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'
import { RecipientPickerDialog } from '@/modules/recipients/RecipientPickerDialog'

interface DraftRecipient {
  key: number
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  deliveryAddress: string
  dateOfBirth?: Date
  giftMessage: string
  internalNotes: string
  photo?: File
  expanded: boolean
  errors: Record<string, string>
}

interface RecipientPrefill {
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  deliveryAddress?: string
  dateOfBirth?: Date
}

function prefillFrom(recipient: Recipient | UpcomingBirthday): RecipientPrefill {
  return {
    recipientName: recipient.name,
    recipientPhone: recipient.phone,
    recipientEmail: recipient.email ?? undefined,
    deliveryAddress: 'address' in recipient ? (recipient.address ?? undefined) : undefined,
    dateOfBirth: recipient.dateOfBirth ? parseDateOnly(recipient.dateOfBirth) : undefined,
  }
}

let nextRowKey = 1
function emptyRow(expanded = false, prefill?: RecipientPrefill): DraftRecipient {
  return {
    key: nextRowKey++,
    recipientName: prefill?.recipientName ?? '',
    recipientPhone: prefill?.recipientPhone ?? '',
    recipientEmail: prefill?.recipientEmail ?? '',
    deliveryAddress: prefill?.deliveryAddress ?? '',
    dateOfBirth: prefill?.dateOfBirth,
    giftMessage: '',
    internalNotes: '',
    expanded,
    errors: {},
  }
}

function isBlankRow(row: DraftRecipient): boolean {
  return !row.recipientName && !row.recipientPhone && !row.recipientEmail && !row.deliveryAddress
}

function validateRow(row: DraftRecipient, photoRequired: boolean): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!row.recipientName.trim()) errors.recipientName = 'Required.'
  if (!row.recipientPhone.trim()) errors.recipientPhone = 'Required.'
  if (!row.deliveryAddress.trim()) errors.deliveryAddress = 'Required.'
  if (photoRequired && !row.photo && !row.recipientEmail.trim()) {
    errors.photoOrEmail = "This gift needs a photo -- upload one now, or add the recipient's email so we can send them an upload link."
  }
  return errors
}

/**
 * One recipient, collapsed to a single compact row by default (name/phone/address --
 * everything needed for most gifts) so many recipients fit on screen without scrolling.
 * "More details" reveals email/photo/message/notes only when actually needed -- a plain
 * responsive grid, not an HTML table, so it reflows to a stacked card on narrow screens
 * instead of forcing horizontal scroll.
 */
function RecipientRow({
  row,
  onUpdate,
  onRemove,
  canRemove,
  photoRequired,
}: {
  row: DraftRecipient
  onUpdate: (patch: Partial<DraftRecipient>) => void
  onRemove: () => void
  canRemove: boolean
  photoRequired: boolean
}) {
  const hasOptionalDetails = Boolean(row.recipientEmail || row.photo || row.giftMessage || row.internalNotes)
  const needsPhotoOrEmail = photoRequired && !row.photo && !row.recipientEmail.trim()

  return (
    <div className={`rounded-lg border bg-surface p-3 ${row.errors.__submit ? 'border-red-500/50' : 'border-border'}`}>
      <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-12 sm:items-center sm:gap-3">
        <div className="sm:col-span-3">
          <InputText
            value={row.recipientName}
            onChange={(e) => onUpdate({ recipientName: e.target.value })}
            placeholder="Recipient name *"
            className={`w-full ${row.errors.recipientName ? 'p-invalid' : ''}`}
          />
        </div>

        <div className="sm:col-span-2">
          <InputText
            value={row.recipientPhone}
            onChange={(e) => onUpdate({ recipientPhone: e.target.value })}
            placeholder="Phone *"
            className={`w-full ${row.errors.recipientPhone ? 'p-invalid' : ''}`}
          />
        </div>

        <div className="sm:col-span-2">
          <Calendar
            value={row.dateOfBirth ?? null}
            onChange={(e) => onUpdate({ dateOfBirth: (e.value as Date) ?? undefined })}
            dateFormat="dd M yy"
            placeholder="Date of birth"
            showIcon
            className="w-full"
          />
        </div>

        <div className="sm:col-span-3">
          <InputText
            value={row.deliveryAddress}
            onChange={(e) => onUpdate({ deliveryAddress: e.target.value })}
            placeholder="Delivery address *"
            className={`w-full ${row.errors.deliveryAddress ? 'p-invalid' : ''}`}
          />
        </div>

        <div className="flex items-center gap-1 sm:col-span-2 sm:justify-end">
          <Button
            label={row.expanded ? 'Less' : needsPhotoOrEmail ? 'Photo needed' : hasOptionalDetails ? 'More •' : 'More'}
            icon={row.expanded ? 'pi pi-chevron-up' : needsPhotoOrEmail ? 'pi pi-exclamation-triangle' : 'pi pi-chevron-down'}
            iconPos="right"
            text
            severity={needsPhotoOrEmail && !row.expanded ? 'warning' : undefined}
            size="small"
            onClick={() => onUpdate({ expanded: !row.expanded })}
          />
          <Button icon="pi pi-trash" text severity="danger" size="small" aria-label="Remove recipient" disabled={!canRemove} onClick={onRemove} />
        </div>
      </div>

      {row.expanded && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Email {photoRequired ? '(required if no photo)' : '(optional)'}
            </label>
            <InputText
              value={row.recipientEmail}
              onChange={(e) => onUpdate({ recipientEmail: e.target.value })}
              className={`w-full ${row.errors.photoOrEmail ? 'p-invalid' : ''}`}
            />
            <p className="mt-1 text-[11px] text-text-muted">
              No photo yet? We'll send this recipient a link to upload one themselves once approved.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Photo {photoRequired ? '(required, or provide an email)' : '(optional)'}
            </label>
            <div className="flex items-center gap-2">
              {row.photo && <span className="max-w-[120px] truncate text-xs text-text-muted">{row.photo.name}</span>}
              <FileUpload
                key={row.photo ? row.photo.name + row.photo.size : 'empty'}
                mode="basic"
                chooseLabel={row.photo ? 'Change' : 'Choose'}
                accept="image/*"
                maxFileSize={10_000_000}
                auto={false}
                onSelect={(e) => onUpdate({ photo: e.files[0] })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Gift Message (optional)</label>
            <InputTextarea
              value={row.giftMessage}
              onChange={(e) => onUpdate({ giftMessage: e.target.value })}
              rows={2}
              placeholder="A short note to include with the gift"
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Internal notes (optional)</label>
            <InputTextarea
              value={row.internalNotes}
              onChange={(e) => onUpdate({ internalNotes: e.target.value })}
              rows={2}
              placeholder="Visible to your team only — never shown to the recipient."
              className="w-full"
            />
          </div>
        </div>
      )}

      {(row.errors.recipientName || row.errors.recipientPhone || row.errors.deliveryAddress) && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">Name, phone, and delivery address are required.</p>
      )}
      {row.errors.photoOrEmail && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{row.errors.photoOrEmail}</p>}
      {row.errors.__submit && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{row.errors.__submit}</p>}
    </div>
  )
}

export function QuickGiftFormPage() {
  const { giftId } = useParams<{ giftId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { prefillRecipient } = (location.state as { prefillRecipient?: Recipient | UpcomingBirthday } | null) ?? {}
  const { data: gifts, isLoading } = useActiveGifts()
  const gift = gifts?.find((g) => g.id === giftId)
  const createRequest = useCreateQuickGiftRequest()

  const [rows, setRows] = useState<DraftRecipient[]>([emptyRow(true, prefillRecipient ? prefillFrom(prefillRecipient) : undefined)])
  const [submitting, setSubmitting] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)

  function updateRow(key: number, patch: Partial<DraftRecipient>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, errors: {} } : r)))
  }

  function addRow() {
    // Auto-expand so a photo-required gift's requirement is visible right away, not
    // discovered only after a failed submit.
    setRows((prev) => [...prev, emptyRow(gift?.photoRequired)])
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  /** If the only row so far is still untouched, the picked recipients replace it instead of leaving a stray blank row alongside them. */
  function handlePickRecipients(picked: Recipient[]) {
    setPickerVisible(false)
    if (picked.length === 0) return
    setRows((prev) => {
      const base = prev.length === 1 && isBlankRow(prev[0]) ? [] : prev
      return [...base, ...picked.map((r) => emptyRow(gift?.photoRequired, prefillFrom(r)))]
    })
  }

  async function onSubmitAll() {
    if (!gift) return
    const validated = rows.map((r) => ({ row: r, errors: validateRow(r, gift.photoRequired) }))
    if (validated.some((v) => Object.keys(v.errors).length > 0)) {
      setRows(validated.map((v) => ({ ...v.row, errors: v.errors, expanded: v.row.expanded || Boolean(v.errors.photoOrEmail) })))
      showToast({
        severity: 'error',
        summary: 'Fix the highlighted rows',
        detail: gift.photoRequired
          ? 'Every recipient needs a name, phone, delivery address, and either a photo or an email.'
          : 'Every recipient needs a name, phone, and delivery address.',
      })
      return
    }

    setSubmitting(true)
    const succeededKeys: number[] = []
    const failures: { key: number; message: string }[] = []

    for (const row of rows) {
      try {
        let photo: QuickGiftPhotoValue | undefined
        if (row.photo) {
          photo = await uploadQuickGiftPhoto(row.photo)
        }
        await createRequest.mutateAsync({
          giftId: gift.id,
          recipientName: row.recipientName.trim(),
          recipientPhone: row.recipientPhone.trim(),
          recipientEmail: row.recipientEmail.trim() || undefined,
          deliveryAddress: row.deliveryAddress.trim(),
          recipientDob: row.dateOfBirth ? format(row.dateOfBirth, 'yyyy-MM-dd') : undefined,
          giftMessage: row.giftMessage.trim() || undefined,
          internalNotes: row.internalNotes.trim() || undefined,
          photo,
        })
        succeededKeys.push(row.key)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send.'
        failures.push({ key: row.key, message })
      }
    }
    setSubmitting(false)

    if (failures.length === 0) {
      showToast({
        severity: 'success',
        summary: succeededKeys.length > 1 ? `${succeededKeys.length} Quick Gift requests sent` : 'Quick Gift request sent',
        detail: 'Sent to your Company Admin for approval.',
      })
      navigate('/quick-gift')
      return
    }

    setRows((prev) =>
      prev
        .filter((r) => !succeededKeys.includes(r.key))
        .map((r) => {
          const failure = failures.find((f) => f.key === r.key)
          return failure ? { ...r, errors: { __submit: failure.message } } : r
        }),
    )
    if (succeededKeys.length > 0) {
      showApiError(new Error(`${succeededKeys.length} sent, ${failures.length} failed. See the remaining row(s) below.`))
    } else {
      showApiError(new Error('Nothing could be sent. See the row error(s) below.'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  if (!gift) {
    return (
      <div>
        <PageHeader title="Quick Gift" backTo="/quick-gift" />
        <EmptyState icon="pi-exclamation-circle" title="Gift not available" description="This gift isn't available for Quick Gift right now." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Quick Gift — ${gift.name}`}
        subtitle="Add as many recipients as you like, then send. No campaign, no waiting — it goes straight to your Company Admin for approval."
        backTo="/quick-gift"
      />

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
          {gift.images[0] ? (
            <img src={gift.images[0].imageUrl} alt={gift.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-text-muted">
              <i className="pi pi-gift" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-text">{gift.name}</p>
          {gift.description && <p className="line-clamp-1 text-xs text-text-muted">{gift.description}</p>}
          {gift.photoRequired && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <i className="pi pi-camera" /> Needs a recipient photo -- upload one, or add their email so we can request it.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <RecipientRow
            key={row.key}
            row={row}
            onUpdate={(patch) => updateRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
            canRemove={rows.length > 1}
            photoRequired={gift.photoRequired}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button label="Add another recipient" icon="pi pi-plus" outlined onClick={addRow} />
        <Button label="Browse existing recipients" icon="pi pi-address-book" outlined onClick={() => setPickerVisible(true)} />
        <Button
          label={rows.length > 1 ? `Send all ${rows.length}` : 'Send request'}
          icon="pi pi-send"
          loading={submitting}
          onClick={onSubmitAll}
        />
      </div>

      <RecipientPickerDialog visible={pickerVisible} onHide={() => setPickerVisible(false)} onConfirm={handlePickRecipients} />
    </div>
  )
}
