import { useCompanyScope } from '@/components/masters/company-scope-select'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useCompany } from '@/hooks/useCompanies'

const USERS_MASTER = '/masters/users'

/**
 * The Users master (list, add, import) serves two audiences from the same screens: a company admin
 * manages their own company's roster, and platform staff work on the company in the scope picker
 * (the first by default, remembered across screens). This resolves the company and the links the
 * pages need.
 */
export function useCompanyUserContext() {
  const scope = useCompanyScope()
  const { data: me } = useCurrentUser()
  const companyId = scope.visible ? (scope.companyId ?? '') : (me?.companyId ?? '')
  const { data: company } = useCompany(scope.visible && companyId ? companyId : undefined)

  return {
    companyId,
    companyName: scope.visible ? company?.name : (me?.companyName ?? undefined),
    scope,
    listPath: USERS_MASTER,
    addPath: `${USERS_MASTER}/add`,
    importPath: `${USERS_MASTER}/import`,
  }
}
