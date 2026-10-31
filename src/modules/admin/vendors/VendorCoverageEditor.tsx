import { Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { Company } from '@/api/companies'
import { SegmentedToggle } from '@/components/fields/segmented-toggle'
import { IconButton } from '@/components/icon-button'
import { MultiValueCombobox, ValueCombobox } from '@/components/masters/value-combobox'
import { Button } from '@/components/ui/button'
import { useCompanyOrgUnits } from '@/hooks/useUsers'

/** One row of where a vendor serves: a company, and the whole of it or only some of its org units. */
export interface CoverageRow {
  key: string
  companyId: string | null
  whole: boolean
  orgUnitIds: string[]
}

let nextKey = 1
export const newCoverageRow = (companyId: string | null = null): CoverageRow => ({ key: `row-${nextKey++}`, companyId, whole: true, orgUnitIds: [] })

function Row({
  row,
  companies,
  taken,
  onChange,
  onRemove,
}: {
  row: CoverageRow
  companies: Company[]
  taken: Set<string>
  onChange: (next: CoverageRow) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('admin')
  const { data: orgUnits } = useCompanyOrgUnits(row.companyId ?? undefined, Boolean(row.companyId))
  const companyOptions = useMemo(
    () => companies.filter((company) => company.id === row.companyId || !taken.has(company.id)).map((company) => ({ value: company.id, label: company.name })),
    [companies, row.companyId, taken],
  )
  const unitOptions = useMemo(() => (orgUnits ?? []).map((unit) => ({ value: unit.id, label: `${unit.levelName}: ${unit.name}` })), [orgUnits])

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[12rem] flex-1">
          <ValueCombobox
            aria-label={t('vendors.coverage.company')}
            options={companyOptions}
            value={row.companyId}
            onChange={(companyId) => onChange({ ...row, companyId, orgUnitIds: [] })}
            placeholder={t('vendors.coverage.pickCompany')}
          />
        </div>
        <SegmentedToggle
          value={row.whole}
          onChange={(whole) => onChange({ ...row, whole, orgUnitIds: whole ? [] : row.orgUnitIds })}
          trueLabel={t('vendors.coverage.whole')}
          falseLabel={t('vendors.coverage.units')}
          disabled={!row.companyId}
        />
        <IconButton icon={Trash2} tone="destructive" label={t('vendors.coverage.remove')} onClick={onRemove} />
      </div>
      {!row.whole && row.companyId && (
        <MultiValueCombobox
          aria-label={t('vendors.coverage.orgUnits')}
          options={unitOptions}
          value={row.orgUnitIds}
          onChange={(orgUnitIds) => onChange({ ...row, orgUnitIds })}
          placeholder={unitOptions.length === 0 ? t('vendors.coverage.noUnits') : t('vendors.coverage.pickUnits')}
          disabled={unitOptions.length === 0}
        />
      )}
    </div>
  )
}

/**
 * Where a vendor serves, as a short list: add a company, then say whether the vendor serves all of it
 * or only some of its org units (each covering everything beneath it). A vendor can serve any number
 * of companies. Kept to one row per company -- a company-and-where pair, not a grid of checkboxes.
 */
export function VendorCoverageEditor({ value, onChange, companies }: { value: CoverageRow[]; onChange: (rows: CoverageRow[]) => void; companies: Company[] }) {
  const { t } = useTranslation('admin')
  const taken = useMemo(() => new Set(value.map((row) => row.companyId).filter((id): id is string => Boolean(id))), [value])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{t('vendors.coverage.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('vendors.coverage.help')}</p>
      </div>
      {value.length > 0 && (
        <div className="divide-y rounded-lg border">
          {value.map((row) => (
            <Row
              key={row.key}
              row={row}
              companies={companies}
              taken={taken}
              onChange={(next) => onChange(value.map((candidate) => (candidate.key === row.key ? next : candidate)))}
              onRemove={() => onChange(value.filter((candidate) => candidate.key !== row.key))}
            />
          ))}
        </div>
      )}
      {value.length === 0 && <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{t('vendors.coverage.none')}</p>}
      <Button type="button" variant="outline" size="sm" disabled={companies.length > 0 && taken.size >= companies.length} onClick={() => onChange([...value, newCoverageRow()])}>
        <Plus />
        {t('vendors.coverage.add')}
      </Button>
    </section>
  )
}
