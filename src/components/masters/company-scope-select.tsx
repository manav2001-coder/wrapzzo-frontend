import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from '@/app/hooks'
import { ValueCombobox, type Option } from '@/components/masters/value-combobox'
import { useCurrentUser } from '@/hooks/use-current-user'
import { usePermissions } from '@/hooks/use-permission'
import { useCompanies } from '@/hooks/useCompanies'
import { useLocalStorage } from '@/hooks/use-local-storage'

/** One scope control is ever on screen, so a constant id cannot collide. */
const SCOPE_FIELD_ID = 'company-scope'

export interface CompanyScope {
  /** Render nothing for a company user -- they have exactly one, and it is implicit. */
  visible: boolean
  /** The company in scope: a company user's own, or platform staff's pick (null for none: the system records). */
  companyId: string | null
  control: React.ReactNode
  /** Move the scope to a company the SCREEN has learned from data. A no-op for a company user. */
  select: (companyId: string | null) => void
  /** Whether the scope has settled: the user is known and, for platform staff, the company list has loaded. */
  ready: boolean
  /** The chosen company's display name ("Name (CID-1)"), or null for none. */
  selectedLabel: string | null
}

/** The localStorage key platform staff's company choice lives under, per signed-in user. */
export function scopeStorageKey(userId: string | undefined): string {
  return `wrapzzo.companyScope.${userId ?? 'anon'}`
}

/**
 * Company picker for PLATFORM STAFF -- MobixFL's franchise scope.
 *
 * Platform staff belong to no company, which makes two things impossible without this: reading one
 * company's data in isolation, and creating anything company-owned (the API derives the owning
 * company from the request). A company user sees no picker; their own company is applied
 * server-side and the control is ignored for them.
 *
 * The choice is REMEMBERED across screens and reloads (`useLocalStorage`, cross-tab synced), keyed
 * per signed-in user so two staff sharing a browser don't see each other's pick, and it defaults to
 * the FIRST company so a screen is never empty for want of a choice.
 */
export function useCompanyScope(): CompanyScope {
  const { t } = useTranslation('admin')
  const { isPlatformStaff, loading } = usePermissions()
  const { data: me } = useCurrentUser()
  const userId = useAppSelector((state) => state.auth.user?.sub)
  const { data: companies, isSuccess, isError } = useCompanies(isPlatformStaff)
  const [selected, setSelected] = useLocalStorage<string | null>(scopeStorageKey(userId), null)

  const options = React.useMemo<Option[]>(
    () => (companies ?? []).map((company) => ({ value: company.id, label: `${company.name} (${company.displayId})` })),
    [companies],
  )

  React.useEffect(() => {
    if (!isPlatformStaff || !isSuccess) return
    // A remembered company that no longer resolves must not be trusted: a stale id would fail the
    // very next request this screen makes. Fall back to the first company.
    setSelected((current) => (current && options.some((option) => option.value === current) ? current : (options[0]?.value ?? null)))
  }, [isPlatformStaff, isSuccess, options, setSelected])

  const control = isPlatformStaff ? (
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <label className="shrink-0 text-sm font-medium leading-tight" htmlFor={SCOPE_FIELD_ID}>
        {t('scope.company')}
      </label>
      <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
        <ValueCombobox id={SCOPE_FIELD_ID} options={options} value={selected} onChange={setSelected} placeholder={t('scope.placeholder')} />
      </div>
    </div>
  ) : null

  const select = React.useCallback(
    (companyId: string | null) => {
      if (isPlatformStaff) setSelected(companyId)
    },
    [isPlatformStaff, setSelected],
  )

  return {
    visible: isPlatformStaff,
    // A company user's own company (the API applies it regardless of what a request names); staff's pick.
    companyId: isPlatformStaff ? selected : (me?.companyId ?? null),
    control,
    select,
    ready: !loading && (!isPlatformStaff || isSuccess || isError),
    selectedLabel: options.find((option) => option.value === selected)?.label ?? null,
  }
}
