import { useMemo } from 'react'

import type { AccessTemplate } from '@/api/templates'
import { Combobox } from '@/components/fields/combobox'
import { Label } from '@/components/ui/label'

/** Picks one template from a list. Shared by the TBAC assignment screens. */
export function TemplateSelect({
  id,
  label,
  placeholder,
  templates,
  value,
  onChange,
}: {
  id: string
  label: string
  placeholder: string
  templates: AccessTemplate[]
  value: string | null
  onChange: (templateId: string | null) => void
}) {
  const options = useMemo(() => templates.map((template) => ({ value: template.id, label: template.name })), [templates])
  return (
    <div className="max-w-sm space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        id={id}
        options={options}
        displayValue={(option) => option.label}
        getOptionKey={(option) => option.value}
        value={options.find((option) => option.value === value) ?? null}
        placeholder={placeholder}
        onChange={(next) => onChange((next as { value: string } | null)?.value ?? null)}
      />
    </div>
  )
}
