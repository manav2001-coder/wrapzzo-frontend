import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Checkbox } from 'primereact/checkbox'
import { Dropdown } from 'primereact/dropdown'
import { FileUpload } from 'primereact/fileupload'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { MultiSelect } from 'primereact/multiselect'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { CampaignField } from '@/api/campaigns'
import { uploadSubmissionAttachment, type AttachmentValue, type SubmissionValues } from '@/api/submissions'
import { PageHeader } from '@/components/PageHeader'
import { useCampaign } from '@/hooks/useCampaigns'
import { useCreateSubmission, useResubmitSubmission } from '@/hooks/useSubmissions'
import { showApiError, showToast } from '@/lib/toast'

type FieldValue = string | number | boolean | string[] | File | undefined

interface ResubmitState {
  resubmitId?: string
  initialGiftId?: string
  initialValues?: Record<string, string | number | boolean | string[]>
}

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
  const location = useLocation()
  const { resubmitId, initialGiftId, initialValues } = (location.state as ResubmitState | null) ?? {}
  const isResubmit = Boolean(resubmitId)

  const { data: campaign, isLoading } = useCampaign(campaignId)
  const createSubmission = useCreateSubmission(campaignId)
  const resubmit = useResubmitSubmission(resubmitId ?? '')

  const [rows, setRows] = useState<DraftRow[]>([
    { key: nextRowKey++, giftId: initialGiftId, values: initialValues ?? {}, errors: {} },
  ])
  const [submitting, setSubmitting] = useState(false)

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

    for (const row of rows) {
      try {
        const payload = await buildPayload(row)
        const giftId = effectiveGiftId(row)!
        if (isResubmit) {
          await resubmit.mutateAsync({ giftId, values: payload })
        } else {
          await createSubmission.mutateAsync({ giftId, values: payload })
        }
        succeededKeys.push(row.key)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit.'
        failures.push({ key: row.key, message })
      }
    }
    setSubmitting(false)

    if (failures.length === 0) {
      showToast({
        severity: 'success',
        summary: isResubmit ? 'Resubmitted' : `${succeededKeys.length} recipient${succeededKeys.length > 1 ? 's' : ''} submitted`,
        detail: 'Sent for approval.',
      })
      navigate(`/campaigns/${campaignId}`)
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
      showApiError(new Error(`${succeededKeys.length} submitted, ${failures.length} failed -- see the remaining row(s) below.`))
    } else {
      showApiError(new Error('Nothing could be submitted -- see the row error(s) below.'))
    }
  }

  if (isLoading || !campaign) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  function renderCell(field: CampaignField, row: DraftRow) {
    const value = row.values[field.fieldKey]
    const error = row.errors[field.fieldKey]
    const invalidClass = error ? 'p-invalid' : ''

    switch (field.fieldType) {
      case 'TEXTAREA':
        return (
          <InputText
            value={(value as string) ?? ''}
            onChange={(e) => updateValue(row.key, field.fieldKey, e.target.value)}
            placeholder={field.placeholder ?? field.label}
            className={`w-full min-w-[160px] ${invalidClass}`}
          />
        )
      case 'NUMBER':
        return (
          <InputNumber
            value={(value as number) ?? null}
            onValueChange={(e) => updateValue(row.key, field.fieldKey, e.value ?? undefined)}
            placeholder={field.placeholder ?? undefined}
            className={`w-full min-w-[100px] ${invalidClass}`}
          />
        )
      case 'DATE':
        return (
          <Calendar
            value={(value as unknown as Date) ?? undefined}
            onChange={(e) => updateValue(row.key, field.fieldKey, (e.value as unknown as FieldValue) ?? undefined)}
            dateFormat="dd M yy"
            className={`w-full min-w-[130px] ${invalidClass}`}
          />
        )
      case 'BOOLEAN':
      case 'CHECKBOX':
        return (
          <div className="flex justify-center">
            <Checkbox checked={Boolean(value)} onChange={(e) => updateValue(row.key, field.fieldKey, !!e.checked)} />
          </div>
        )
      case 'SELECT':
      case 'RADIO':
        return (
          <Dropdown
            value={value as string}
            onChange={(e) => updateValue(row.key, field.fieldKey, e.value)}
            options={field.options.map((o) => ({ label: o, value: o }))}
            placeholder={field.placeholder ?? 'Select'}
            className={`w-full min-w-[140px] ${invalidClass}`}
          />
        )
      case 'MULTISELECT':
        return (
          <MultiSelect
            value={(value as string[]) ?? []}
            onChange={(e) => updateValue(row.key, field.fieldKey, e.value)}
            options={field.options.map((o) => ({ label: o, value: o }))}
            placeholder={field.placeholder ?? 'Select'}
            display="comma"
            className={`w-full min-w-[150px] ${invalidClass}`}
          />
        )
      case 'IMAGE':
      case 'FILE':
        return (
          <div className="flex min-w-[150px] items-center gap-1.5">
            {value instanceof File ? (
              <span className="max-w-[80px] truncate text-xs text-text-muted" title={value.name}>
                {value.name}
              </span>
            ) : null}
            <FileUpload
              key={value instanceof File ? value.name + value.size : 'empty'}
              mode="basic"
              chooseLabel={value instanceof File ? 'Change' : 'Choose'}
              accept={field.fieldType === 'IMAGE' ? 'image/*' : undefined}
              maxFileSize={10_000_000}
              onSelect={(e) => updateValue(row.key, field.fieldKey, e.files[0])}
              auto={false}
            />
          </div>
        )
      default:
        return (
          <InputText
            value={(value as string) ?? ''}
            onChange={(e) => updateValue(row.key, field.fieldKey, e.target.value)}
            placeholder={field.placeholder ?? field.label}
            className={`w-full min-w-[140px] ${invalidClass}`}
          />
        )
    }
  }

  return (
    <div>
      <PageHeader
        title={isResubmit ? 'Resubmit recipient' : 'Submit recipients'}
        subtitle={`${campaign.displayId} · ${campaign.name}${!isResubmit ? ' -- add as many recipients as you like in one go.' : ''}`}
        backTo={`/campaigns/${campaignId}`}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">
                Gift <span className="text-red-500 dark:text-red-400">*</span>
              </th>
              {campaign.fields.map((field) => (
                <th key={field.id} className="px-3 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap">
                  {field.label}
                  {field.required && <span className="text-red-500 dark:text-red-400"> *</span>}
                </th>
              ))}
              {!isResubmit && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border align-top last:border-b-0">
                <td className="p-1.5">
                  {campaign.gifts.length === 1 ? (
                    <span className="block min-w-[130px] px-2 py-1.5 text-sm text-text">{campaign.gifts[0].name}</span>
                  ) : (
                    <Dropdown
                      value={effectiveGiftId(row)}
                      onChange={(e) => updateRow(row.key, { giftId: e.value })}
                      options={campaign.gifts.map((g) => ({ label: g.name, value: g.id }))}
                      placeholder="Choose"
                      className={`w-full min-w-[140px] ${row.errors.__gift ? 'p-invalid' : ''}`}
                    />
                  )}
                </td>
                {campaign.fields.map((field) => (
                  <td key={field.id} className="p-1.5">
                    {renderCell(field, row)}
                    {row.errors[field.fieldKey] && (
                      <small className="mt-0.5 block text-red-500 dark:text-red-400">{row.errors[field.fieldKey]}</small>
                    )}
                  </td>
                ))}
                {!isResubmit && (
                  <td className="p-1.5 text-center">
                    <Button
                      icon="pi pi-trash"
                      text
                      severity="danger"
                      disabled={rows.length === 1}
                      aria-label="Remove row"
                      onClick={() => removeRow(row.key)}
                    />
                  </td>
                )}
                {row.errors.__submit && (
                  <td colSpan={campaign.fields.length + 2} className="px-3 pb-2">
                    <small className="text-red-500 dark:text-red-400">{row.errors.__submit}</small>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!isResubmit && <Button label="Add row" icon="pi pi-plus" outlined onClick={addRow} />}
        <Button
          label={isResubmit ? 'Resubmit' : `Submit ${rows.length > 1 ? `all ${rows.length}` : ''}`}
          icon="pi pi-send"
          loading={submitting}
          onClick={onSubmitAll}
        />
      </div>
    </div>
  )
}
