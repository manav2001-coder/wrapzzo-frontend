import { Button } from 'primereact/button'
import { FileUpload } from 'primereact/fileupload'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { uploadQuickGiftPhoto, type QuickGiftPhotoValue } from '@/api/quickGifts'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useActiveGifts } from '@/hooks/useGifts'
import { useCreateQuickGiftRequest } from '@/hooks/useQuickGifts'
import { showApiError, showToast } from '@/lib/toast'

interface DraftRecipient {
  key: number
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  deliveryAddress: string
  giftMessage: string
  internalNotes: string
  photo?: File
  expanded: boolean
  errors: Record<string, string>
}

let nextRowKey = 1
function emptyRow(expanded = false): DraftRecipient {
  return {
    key: nextRowKey++,
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    deliveryAddress: '',
    giftMessage: '',
    internalNotes: '',
    expanded,
    errors: {},
  }
}

function validateRow(row: DraftRecipient): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!row.recipientName.trim()) errors.recipientName = 'Required.'
  if (!row.recipientPhone.trim()) errors.recipientPhone = 'Required.'
  if (!row.deliveryAddress.trim()) errors.deliveryAddress = 'Required.'
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
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  row: DraftRecipient
  index: number
  onUpdate: (patch: Partial<DraftRecipient>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const hasOptionalDetails = Boolean(row.recipientEmail || row.photo || row.giftMessage || row.internalNotes)

  return (
    <div className={`rounded-lg border bg-surface p-3 ${row.errors.__submit ? 'border-red-500/50' : 'border-border'}`}>
      <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-12 sm:items-center sm:gap-3">
        <span className="hidden shrink-0 text-xs text-text-muted sm:col-span-1 sm:block">{index + 1}</span>

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

        <div className="sm:col-span-4">
          <InputText
            value={row.deliveryAddress}
            onChange={(e) => onUpdate({ deliveryAddress: e.target.value })}
            placeholder="Delivery address *"
            className={`w-full ${row.errors.deliveryAddress ? 'p-invalid' : ''}`}
          />
        </div>

        <div className="flex items-center gap-1 sm:col-span-2 sm:justify-end">
          <Button
            label={row.expanded ? 'Less' : hasOptionalDetails ? 'More •' : 'More'}
            icon={row.expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
            iconPos="right"
            text
            size="small"
            onClick={() => onUpdate({ expanded: !row.expanded })}
          />
          <Button icon="pi pi-trash" text severity="danger" size="small" aria-label="Remove recipient" disabled={!canRemove} onClick={onRemove} />
        </div>
      </div>

      {row.expanded && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Email (optional)</label>
            <InputText value={row.recipientEmail} onChange={(e) => onUpdate({ recipientEmail: e.target.value })} className="w-full" />
            <p className="mt-1 text-[11px] text-text-muted">
              No photo yet? We'll send this recipient a link to upload one themselves once approved.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Photo (optional)</label>
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
      {row.errors.__submit && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{row.errors.__submit}</p>}
    </div>
  )
}

export function QuickGiftFormPage() {
  const { giftId } = useParams<{ giftId: string }>()
  const navigate = useNavigate()
  const { data: gifts, isLoading } = useActiveGifts()
  const gift = gifts?.find((g) => g.id === giftId)
  const createRequest = useCreateQuickGiftRequest()

  const [rows, setRows] = useState<DraftRecipient[]>([emptyRow(true)])
  const [submitting, setSubmitting] = useState(false)

  function updateRow(key: number, patch: Partial<DraftRecipient>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, errors: {} } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  async function onSubmitAll() {
    if (!gift) return
    const validated = rows.map((r) => ({ row: r, errors: validateRow(r) }))
    if (validated.some((v) => Object.keys(v.errors).length > 0)) {
      setRows(validated.map((v) => ({ ...v.row, errors: v.errors })))
      showToast({ severity: 'error', summary: 'Fix the highlighted rows', detail: 'Every recipient needs a name, phone, and delivery address.' })
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
        <PageHeader title="Quick Gift" backTo="/gift-store" />
        <EmptyState icon="pi-exclamation-circle" title="Gift not available" description="This gift isn't available for Quick Gift right now." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Quick Gift — ${gift.name}`}
        subtitle="Add as many recipients as you like, then send. No campaign, no waiting — it goes straight to your Company Admin for approval."
        backTo="/gift-store"
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
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <RecipientRow
            key={row.key}
            row={row}
            index={index}
            onUpdate={(patch) => updateRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
            canRemove={rows.length > 1}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button label="Add another recipient" icon="pi pi-plus" outlined onClick={addRow} />
        <Button
          label={rows.length > 1 ? `Send all ${rows.length}` : 'Send request'}
          icon="pi pi-send"
          loading={submitting}
          onClick={onSubmitAll}
        />
      </div>
    </div>
  )
}
