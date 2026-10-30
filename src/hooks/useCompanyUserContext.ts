import { useCurrentUser } from '@/hooks/use-current-user'
import { useCompany } from '@/hooks/useCompanies'
import { useAccessCompany } from '@/hooks/useAccessCompany'

const USERS_MASTER = '/masters/users'

/**
 * The Users master (list, add, import) serves two audiences from the same screens: a company
 * admin manages their own company's roster, and platform staff work on the company picked in the
 * scope bar (the first by default), carried in the URL as `?company=` so the add and import
 * screens stay on it. This resolves the company and builds every link the pages need.
 */
export function useCompanyUserContext() {
  const { companyId, isPlatformStaff, setPicked, scoped } = useAccessCompany()
  const { data: company } = useCompany(isPlatformStaff ? companyId : undefined)
  const { data: me } = useCurrentUser()

  return {
    companyId: companyId ?? '',
    companyName: isPlatformStaff ? company?.name : (me?.companyName ?? undefined),
    isPlatformStaff,
    setCompany: setPicked,
    listPath: scoped(USERS_MASTER),
    addPath: scoped(`${USERS_MASTER}/add`),
    importPath: scoped(`${USERS_MASTER}/import`),
  }
}
