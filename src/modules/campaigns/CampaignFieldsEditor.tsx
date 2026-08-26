import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import type { CampaignField, FieldType } from '@/api/campaigns'
import { EmptyState } from '@/components/EmptyState'

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
  { label: 'Text', value: 'TEXT' },
  { label: 'Long text', value: 'TEXTAREA' },
  { label: 'Number', value: 'NUMBER' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Phone', value: 'PHONE' },
  { label: 'Date', value: 'DATE' },
  { label: 'Dropdown (single)', value: 'SELECT' },
  { label: 'Dropdown (multiple)', value: 'MULTISELECT' },
  { label: 'Checkbox', value: 'CHECKBOX' },
  { label: 'Radio', value: 'RADIO' },
  { label: 'Yes/No', value: 'BOOLEAN' },
  { label: 'Photo', value: 'IMAGE' },
  { label: 'File', value: 'FILE' },
]

function toFieldKey(label: string, existing: Set<string>): string {
  const base =
    label
      .trim()
      .split(/\s+/)
      .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join('')
      .replace(/[^a-zA-Z0-9]/g, '') || 'field'
  let key = base
  let n = 2
  while (existing.has(key)) {
    key = `${base}${n++}`
  }
  return key
}

export interface DraftField {
  key: string
  fieldKey: string
  label: string
  fieldType: FieldType
  required: boolean
  placeholder: string
  options: string[]
}

export function draftFromFields(fields: CampaignField[]): DraftField[] {
  return fields.map((f) => ({
    key: f.id,
    fieldKey: f.fieldKey,
    label: f.label,
    fieldType: f.fieldType,
    required: f.required,
    placeholder: f.placeholder ?? '',
    options: f.options,
  }))
}

let nextKey = 1

export function CampaignFieldsEditor({
  fields,
  onChange,
  disabled,
}: {
  fields: DraftField[]
  onChange: (fields: DraftField[]) => void
  disabled?: boolean
}) {
  const [newLabel, setNewLabel] = useState('')

  function update(key: string, patch: Partial<DraftField>) {
    onChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  }

  function remove(key: string) {
    onChange(fields.filter((f) => f.key !== key))
  }

  function addField() {
    if (!newLabel.trim()) return
    const existingKeys = new Set(fields.map((f) => f.fieldKey))
    onChange([
      ...fields,
      {
        key: `new-${nextKey++}`,
        fieldKey: toFieldKey(newLabel, existingKeys),
        label: newLabel.trim(),
        fieldType: 'TEXT',
        required: false,
        placeholder: '',
        options: [],
      },
    ])
    setNewLabel('')
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <EmptyState icon="pi-list" title="No fields yet" description="Add at least one below so field users know what to submit." />
      )}

      {fields.map((field) => (
        <div key={field.key} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <InputText
              value={field.label}
              onChange={(e) => update(field.key, { label: e.target.value })}
              disabled={disabled}
              className="w-full"
              placeholder="Label"
            />
          </div>
          <div className="sm:col-span-3">
            <Dropdown
              value={field.fieldType}
              onChange={(e) => update(field.key, { fieldType: e.value })}
              options={FIELD_TYPE_OPTIONS}
              disabled={disabled}
              className="w-full"
            />
          </div>
          <div className="sm:col-span-3">
            <InputText
              value={field.placeholder}
              onChange={(e) => update(field.key, { placeholder: e.target.value })}
              disabled={disabled}
              className="w-full"
              placeholder="Placeholder (optional)"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-1">
            <Checkbox checked={field.required} onChange={(e) => update(field.key, { required: !!e.checked })} disabled={disabled} />
            <span className="text-xs text-text-muted">Required</span>
          </div>
          <div className="flex justify-end sm:col-span-1">
            <Button icon="pi pi-trash" text severity="danger" disabled={disabled} onClick={() => remove(field.key)} aria-label="Remove field" />
          </div>
        </div>
      ))}

      {!disabled && (
        <div className="flex items-center gap-2">
          <InputText
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New field label, e.g. Shirt Size"
            className="max-w-sm flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
          />
          <Button label="Add field" icon="pi pi-plus" outlined onClick={addField} disabled={!newLabel.trim()} />
        </div>
      )}
    </div>
  )
}
