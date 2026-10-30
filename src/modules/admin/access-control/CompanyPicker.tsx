import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Combobox } from '@/components/fields/combobox'
import { Label } from '@/components/ui/label'
import { useCompanies } from '@/hooks/useCompanies'

/** The company chooser platform staff use on the roles and templates screens. */
export function CompanyPicker({ value, onChange, id }: { value: string | null; onChange: (companyId: string | null) => void; id: string }) {
  const { t } = useTranslation('admin')
  const { data: companies } = useCompanies()
  const options = useMemo(() => (companies ?? []).map((c) => ({ value: c.id, label: c.name })), [companies])

  return (
    <div className="max-w-sm space-y-1.5">
      <Label htmlFor={id}>{t('access.company')}</Label>
      <Combobox
        id={id}
        options={options}
        displayValue={(option) => option.label}
        getOptionKey={(option) => option.value}
        value={options.find((option) => option.value === value) ?? null}
        placeholder={t('access.pickCompany')}
        onChange={(next) => onChange((next as { value: string } | null)?.value ?? null)}
      />
    </div>
  )
}
