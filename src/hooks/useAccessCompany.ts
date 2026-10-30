import { useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useCompanies } from '@/hooks/useCompanies'

/** `?company=system` asks for the system (shared) records instead of a company's. */
const SYSTEM = 'system'

/**
 * Which company the roles, users, orders and TBAC screens work on -- the scope, as MobixFL's
 * franchise filter: a company user's own, or, for platform staff (who belong to none), the one
 * they pick, defaulting to the first company so a screen is never empty for want of a choice.
 * The pick lives in the URL as `?company=` so the assign screens a list opens stay on it, and
 * `scoped(path)` builds a link that keeps it. Staff may also choose `system` (no company) where a
 * screen has shared records, such as the system templates.
 */
export function useAccessCompany() {
  const { data: me } = useCurrentUser()
  const isPlatformStaff = Boolean(me) && !me?.companyId
  const { data: companies } = useCompanies(isPlatformStaff)
  const [searchParams, setSearchParams] = useSearchParams()
  const param = isPlatformStaff ? searchParams.get('company') : null
  const isSystem = param === SYSTEM
  const picked = isSystem ? null : (param ?? companies?.[0]?.id ?? null)
  const companyId = me?.companyId ?? picked ?? undefined

  return {
    isPlatformStaff,
    /** Staff chose "no company": the system records. */
    isSystem,
    companyId,
    picked,
    /** A company id, `null` for the default (the first company), or 'system'. */
    setPicked: (id: string | null) => setSearchParams(id ? { company: id } : {}, { replace: true }),
    scoped: (path: string) => (isSystem ? `${path}?company=${SYSTEM}` : picked ? `${path}?company=${picked}` : path),
  }
}

export const SYSTEM_SCOPE = SYSTEM
