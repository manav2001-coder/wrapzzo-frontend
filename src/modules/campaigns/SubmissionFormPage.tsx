import { ArrowLeft, Camera, Paperclip, Plus, Send, Trash2 } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { showApiError, showToast } from '@/lib/toast'

import type { CampaignField } from '@/api/campaigns'
import { uploadSubmissionAttachment, type AttachmentValue, type SubmissionValues } from '@/api/submissions'
import { Combobox } from '@/components/fields/combobox'
import { DatePicker } from '@/components/fields/date-picker'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { PhotoLinkDialog, type PhotoLinkPrompt } from '@/components/orders/photo-link-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaign } from '@/hooks/useCampaigns'
import { useHasAccess } from '@/hooks/use-permission'
import { useCreateSubmission } from '@/hooks/useSubmissions'

type FieldValue = string | number | boolean | string[] | File | undefined

interface DraftRow {
  key: number
  giftId?: string
  values: Record<string, FieldValue>
  errors: Record<string, string>
}

let nextRowKey = 1
function emptyRow(giftId?: string): DraftRow {
  return { key: nextRowKey++, giftId, values: {}, errors: {} }
}

export function SubmissionFormPage() {
  const { id } = useParams<{ id: string }>()
  const campaignId = id ?? ''
  const navigate = useNavigate()
  // A Member can't edit/manage a campaign, so the near-empty read-only Campaign Detail page
  // is a dead end for them -- send them back to their own board instead.
  const canManageCampaigns = useHasAccess('campaign.manage')
  const backTarget = canManageCampaigns ? `/campaigns/${campaignId}` : '/my-campaigns'

  const { data: campaign, isLoading } = useCampaign(campaignId)
  const createSubmission = useCreateSubmission(campaignId)

  const [rows, setRows] = useState<DraftRow[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [photoLinkQueue, setPhotoLinkQueue] = useState<PhotoLinkPrompt[]>([])

  function updateRow(key: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, errors: {} } : r)))
  }

  function updateValue(key: number, fieldKey: string, value: FieldValue) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, values: { ...r.values, [fieldKey]: value }, errors: { ...r.errors, [fieldKey]: '' } } : r)),
    )
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(campaign?.gifts.length === 1 ? campaign.gifts[0].id : undefined)])
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  function effectiveGiftId(row: DraftRow): string | undefined {
    return row.giftId ?? (campaign?.gifts.length === 1 ? campaign.gifts[0].id : undefined)
  }

  /** True only if the campaign's form still has both fields under their default keys --
   * mirrors the backend's same "quietly skip, never block" fallback for a renamed/removed field. */
  function canCheckPhotoOrEmail(): boolean {
    const fields = campaign?.fields ?? []
    return fields.some((f) => f.fieldKey === 'photo') && fields.some((f) => f.fieldKey === 'recipientEmail')
  }

  function rowGift(row: DraftRow) {
    return campaign?.gifts.find((g) => g.id === effectiveGiftId(row))
  }

  function validateRow(row: DraftRow): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!effectiveGiftId(row)) {
      errors.__gift = 'Pick a gift.'
    }
    for (const field of campaign?.fields ?? []) {
      const v = row.values[field.fieldKey]
      const blank = v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
      if (field.required && blank) {
        errors[field.fieldKey] = `${field.label} is required.`
      }
    }

    if (rowGift(row)?.photoRequired && canCheckPhotoOrEmail() && !row.values.photo && !row.values.recipientEmail) {
      const message = "Upload a photo, or add the recipient's email so we can send an upload link."
      errors.photo = message
      errors.recipientEmail = message
    }

    return errors
  }

  async function buildPayload(row: DraftRow): Promise<SubmissionValues> {
    const payload: SubmissionValues = {}
    for (const field of campaign?.fields ?? []) {
      const v = row.values[field.fieldKey]
      if (v === undefined || v === '') continue
      if ((field.fieldType === 'IMAGE' || field.fieldType === 'FILE') && v instanceof File) {
        const attachment: AttachmentValue = await uploadSubmissionAttachment(campaignId, v)
        payload[field.fieldKey] = attachment
      } else if (field.fieldType === 'DATE' && v instanceof Date) {
        payload[field.fieldKey] = v.toISOString().slice(0, 10)
      } else {
        payload[field.fieldKey] = v as string | number | boolean | string[]
      }
    }
    return payload
  }

  async function onSubmitAll() {
    if (!campaign) return
    const validated = rows.map((r) => ({ row: r, errors: validateRow(r) }))
    if (validated.some((v) => Object.keys(v.errors).length > 0)) {
      setRows(validated.map((v) => ({ ...v.row, errors: v.errors })))
      showToast({ severity: 'error', summary: 'Fix the highlighted rows', detail: 'Every row needs a gift and its required fields filled in.' })
      return
    }

    setSubmitting(true)
    const succeededKeys: number[] = []
    const failures: { key: number; message: string }[] = []
    const photoLinkPrompts: PhotoLinkPrompt[] = []

    for (const row of rows) {
      try {
        const payload = await buildPayload(row)
        const giftId = effectiveGiftId(row)!
        const result = await createSubmission.mutateAsync({ giftId, values: payload })
        succeededKeys.push(row.key)
        if (result.recipientUploadUrl) {
          const phone = row.values.recipientPhone
          const name = row.values.recipientName
          photoLinkPrompts.push({
            link: result.recipientUploadUrl,
            phone: typeof phone === 'string' ? phone : null,
            recipientName: typeof name === 'string' ? name : null,
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit.'
        failures.push({ key: row.key, message })
      }
    }
    setSubmitting(false)

    if (failures.length === 0) {
      showToast({
        severity: 'success',
        summary: `${succeededKeys.length} recipient${succeededKeys.length > 1 ? 's' : ''} submitted`,
        detail: `Order${succeededKeys.length > 1 ? 's' : ''} created.`,
      })
      if (photoLinkPrompts.length > 0) {
        setPhotoLinkQueue(photoLinkPrompts)
      } else {
        navigate(backTarget)
      }
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
      showApiError(new Error(`${succeededKeys.length} submitted, ${failures.length} failed. See the remaining row(s) below.`))
    } else {
      showApiError(new Error('Nothing could be submitted. See the row error(s) below.'))
    }
  }

  if (isLoading || !campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  function renderCell(field: CampaignField, row: DraftRow, rowNumber: number) {
    const value = row.values[field.fieldKey]
    const invalid = Boolean(row.errors[field.fieldKey])
    const label = `${field.label}, row ${rowNumber}`

    switch (field.fieldType) {
      case 'NUMBER':
        return (
          <Input
            type="number"
            aria-label={label}
            aria-invalid={invalid}
            value={value === undefined ? '' : String(value)}
            onChange={(e) => updateValue(row.key, field.fieldKey, e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder={field.placeholder ?? undefined}
            className="min-w-[100px]"
          />
        )
      case 'DATE':
        return (
          <div className="min-w-[150px]">
            <DatePicker
              value={(value as unknown as Date) ?? null}
              onChange={(date) => updateValue(row.key, field.fieldKey, (date as unknown as FieldValue) ?? undefined)}
            />
          </div>
        )
      case 'BOOLEAN':
      case 'CHECKBOX':
        return (
          <div className="flex justify-center pt-2">
            <Checkbox aria-label={label} checked={Boolean(value)} onCheckedChange={(checked) => updateValue(row.key, field.fieldKey, checked === true)} />
          </div>
        )
      case 'SELECT':
      case 'RADIO':
        return (
          <Select value={(value as string) ?? ''} onValueChange={(next) => updateValue(row.key, field.fieldKey, next)}>
            <SelectTrigger aria-label={label} aria-invalid={invalid} className="min-w-[140px]">
              <SelectValue placeholder={field.placeholder ?? 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'MULTISELECT':
        return (
          <Combobox<string>
            multiple
            options={field.options}
            displayValue={(option) => option}
            value={(value as string[]) ?? []}
            onChange={(next) => updateValue(row.key, field.fieldKey, (next as string[] | null) ?? [])}
            placeholder={field.placeholder ?? 'Select'}
            className="min-w-[160px]"
          />
        )
      case 'IMAGE':
      case 'FILE':
        return (
          <label className="flex min-w-[160px] cursor-pointer items-center gap-1.5">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-accent">
              <Paperclip className="h-3.5 w-3.5" />
              {value instanceof File ? 'Change' : 'Choose'}
            </span>
            {value instanceof File && (
              <span className="max-w-[90px] truncate text-xs text-muted-foreground" title={value.name}>
                {value.name}
              </span>
            )}
            <input
              type="file"
              aria-label={label}
              className="sr-only"
              accept={field.fieldType === 'IMAGE' ? 'image/*' : undefined}
              onChange={(e) => e.target.files?.[0] && updateValue(row.key, field.fieldKey, e.target.files[0])}
            />
          </label>
        )
      default:
        return (
          <Input
            aria-label={label}
            aria-invalid={invalid}
            value={(value as string) ?? ''}
            onChange={(e) => updateValue(row.key, field.fieldKey, e.target.value)}
            placeholder={field.placeholder ?? field.label}
            className={field.fieldType === 'TEXTAREA' ? 'min-w-[160px]' : 'min-w-[140px]'}
          />
        )
    }
  }

  function dismissPhotoLinkPrompt() {
    setPhotoLinkQueue((prev) => {
      const rest = prev.slice(1)
      if (rest.length === 0) navigate(backTarget)
      return rest
    })
  }

  return (
    <div className="space-y-4 pb-6">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label="Back" onClick={() => navigate(backTarget)} />}
        title="Submit recipients"
        description={`${campaign.displayId} · ${campaign.name}. Add as many recipients as you like in one go.`}
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Gift <span className="text-destructive">*</span>
              </th>
              {campaign.fields.map((field) => (
                <th key={field.id} className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-muted-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Fragment key={row.key}>
                <tr className="border-b align-top last:border-b-0">
                  <td className="p-1.5">
                    {campaign.gifts.length === 1 ? (
                      <span className="block min-w-[130px] px-2 py-2 text-sm">{campaign.gifts[0].name}</span>
                    ) : (
                      <Select value={effectiveGiftId(row) ?? ''} onValueChange={(giftId) => updateRow(row.key, { giftId })}>
                        <SelectTrigger aria-label={`Gift, row ${index + 1}`} aria-invalid={Boolean(row.errors.__gift)} className="min-w-[140px]">
                          <SelectValue placeholder="Choose" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaign.gifts.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {rowGift(row)?.photoRequired && (
                      <small className="mt-0.5 flex items-center gap-1 text-warning">
                        <Camera className="h-3 w-3" />
                        Needs a photo or email
                      </small>
                    )}
                    {row.errors.__gift && <small className="mt-0.5 block text-destructive">{row.errors.__gift}</small>}
                  </td>
                  {campaign.fields.map((field) => (
                    <td key={field.id} className="p-1.5">
                      {renderCell(field, row, index + 1)}
                      {row.errors[field.fieldKey] && <small className="mt-0.5 block text-destructive">{row.errors[field.fieldKey]}</small>}
                    </td>
                  ))}
                  <td className="p-1.5 text-center">
                    <IconButton icon={Trash2} tone="destructive" label={`Remove row ${index + 1}`} disabled={rows.length === 1} onClick={() => removeRow(row.key)} />
                  </td>
                </tr>
                {row.errors.__submit && (
                  <tr>
                    <td colSpan={campaign.fields.length + 2} className="px-3 pb-2">
                      <p role="alert" className="text-xs text-destructive">
                        {row.errors.__submit}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={addRow}>
          <Plus />
          Add row
        </Button>
        <Button loading={submitting} onClick={() => void onSubmitAll()}>
          <Send />
          {rows.length > 1 ? `Submit all ${rows.length}` : 'Submit'}
        </Button>
      </div>

      <PhotoLinkDialog prompt={photoLinkQueue[0] ?? null} onClose={dismissPhotoLinkPrompt} />
    </div>
  )
}
