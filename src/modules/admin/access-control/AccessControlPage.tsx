import { Loader2, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AccessControlItem } from '@/api/accessControls'
import type { DesignationAccess } from '@/api/designations'
import { EmptyState } from '@/components/empty-state'
import { CheckboxField } from '@/components/fields/checkbox-field'
import { Combobox } from '@/components/fields/combobox'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanies } from '@/hooks/useCompanies'
import { useAccessControlCatalog, useDesignationAccess, useDesignations, useReplaceDesignationAccess } from '@/hooks/useDesignations'

function groupByCategory(items: AccessControlItem[]): [string, AccessControlItem[]][] {
  const groups = new Map<string, AccessControlItem[]>()
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item])
  return [...groups.entries()]
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((value) => b.has(value))

/** One designation's grants, a checkbox per key grouped by category; Save replaces the whole set. */
function DesignationEditor({
  companyId,
  access,
  groups,
}: {
  companyId: string
  access: DesignationAccess
  groups: [string, AccessControlItem[]][]
}) {
  const { t } = useTranslation('admin')
  const replaceAccess = useReplaceDesignationAccess(companyId)
  const showError = useApiErrorToast()
  const saved = useMemo(() => new Set(access.accessControlIds), [access])
  const [checked, setChecked] = useState<Set<string>>(saved)
  const total = groups.reduce((sum, [, items]) => sum + items.length, 0)

  function toggle(id: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function save() {
    try {
      await replaceAccess.mutateAsync({ designation: access.designation, accessControlIds: [...checked] })
      toast.success(t('access.updated', { designation: access.designation, count: checked.size }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <SectionCard
      title={access.designation}
      description={t('access.granted', { count: checked.size, total })}
      actions={
        <Button size="sm" onClick={() => void save()} disabled={sameSet(checked, saved) || replaceAccess.isPending}>
          {replaceAccess.isPending && <Loader2 className="animate-spin" />}
          {t('access.save')}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([category, items]) => (
          <div key={category} className="space-y-3 rounded-md border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
            {items.map((item) => (
              <CheckboxField
                key={item.id}
                label={item.name}
                helperText={item.description ?? undefined}
                checked={checked.has(item.id)}
                onCheckedChange={(on) => toggle(item.id, on)}
              />
            ))}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/**
 * Designation-level access: every user with a given designation in a company gets these keys on
 * top of their role's (the backend unions the two, see AccessControlCacheService).
 */
export function AccessControlPage() {
  const { t } = useTranslation('admin')
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [designation, setDesignation] = useState<string | null>(null)

  const { data: designations } = useDesignations(companyId ?? undefined)
  const { data: catalog } = useAccessControlCatalog()
  const { data: access } = useDesignationAccess(companyId ?? undefined, designation ?? undefined)
  const groups = useMemo(() => groupByCategory(catalog ?? []), [catalog])

  const companyOptions = useMemo(() => (companies ?? []).map((c) => ({ value: c.id, label: c.name })), [companies])
  const designationOptions = useMemo(() => (designations ?? []).map((d) => ({ value: d, label: d })), [designations])

  return (
    <div className="space-y-6">
      <MasterPageHeader title={t('access.title')} description={t('access.subtitle')} />

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="access-company">{t('access.company')}</Label>
          <Combobox
            id="access-company"
            options={companyOptions}
            displayValue={(option) => option.label}
            getOptionKey={(option) => option.value}
            value={companyOptions.find((option) => option.value === companyId) ?? null}
            placeholder={t('access.pickCompany')}
            onChange={(next) => {
              setCompanyId((next as { value: string } | null)?.value ?? null)
              setDesignation(null)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-designation">{t('access.designation')}</Label>
          <Combobox
            id="access-designation"
            options={designationOptions}
            displayValue={(option) => option.label}
            getOptionKey={(option) => option.value}
            value={designationOptions.find((option) => option.value === designation) ?? null}
            placeholder={t('access.pickDesignation')}
            disabled={!companyId}
            onChange={(next) => setDesignation((next as { value: string } | null)?.value ?? null)}
          />
        </div>
      </div>

      {companyId && designations?.length === 0 ? (
        <EmptyState icon={ShieldCheck} size="sm" title={t('access.noDesignations')} />
      ) : companyId && access ? (
        <DesignationEditor key={`${companyId}:${access.designation}`} companyId={companyId} access={access} groups={groups} />
      ) : (
        <EmptyState icon={ShieldCheck} size="sm" title={t('access.pickBoth')} />
      )}
    </div>
  )
}
