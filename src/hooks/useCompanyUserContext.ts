import { useSearchParams } from 'react-router-dom'
import { useCompany } from '@/hooks/useCompanies'
import { useCurrentUser } from '@/hooks/use-current-user'

const USERS_MASTER = '/masters/users'

/**
 * The Users master (list, add, import) serves two audiences from the same screens: a company
 * admin manages their own company's roster -- the company comes from their account via
 * /api/auth/me -- and platform staff, who belong to none, pick a company, carried in the URL as
 * `?company=` so the add and import screens stay on it. This resolves which mode we're in and
 * builds every link the pages need.
 */
export function useCompanyUserContext() {
  const { data: me } = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const isPlatformStaff = Boolean(me) && !me?.companyId
  const companyId = me?.companyId ?? searchParams.get('company') ?? ''
  const { data: company } = useCompany(isPlatformStaff && companyId ? companyId : undefined)
  const withCompany = (path: string) => (isPlatformStaff && companyId ? `${path}?company=${companyId}` : path)

  return {
    companyId,
    companyName: isPlatformStaff ? company?.name : (me?.companyName ?? undefined),
    isPlatformStaff,
    setCompany: (id: string | null) => setSearchParams(id ? { company: id } : {}, { replace: true }),
    listPath: withCompany(USERS_MASTER),
    addPath: withCompany(`${USERS_MASTER}/add`),
    importPath: withCompany(`${USERS_MASTER}/import`),
  }
}
