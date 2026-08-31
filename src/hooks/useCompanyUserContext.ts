import { useParams } from 'react-router-dom'
import { useCompany } from '@/hooks/useCompanies'
import { useCurrentUser } from '@/hooks/usePermissions'

/**
 * The Users pages (list/add/import) are reachable two ways: a platform admin managing one
 * company's roster (/admin/companies/:id/users, superadmin-only, company.manage-gated
 * useCompany call), or a Company Admin managing their own (/company/users, no id in the
 * URL -- companyId comes from their own account via /api/auth/me, which every company user
 * can already call, no new permission needed). This resolves which mode we're in and gives
 * every internal link a consistent base to build off of.
 */
export function useCompanyUserContext() {
  const { id } = useParams<{ id?: string }>()
  const { data: company } = useCompany(id)
  const { data: me } = useCurrentUser()

  if (id) {
    return { companyId: id, companyName: company?.name, basePath: `/admin/companies/${id}`, backTo: `/admin/companies/${id}` }
  }
  return {
    companyId: me?.companyId ?? '',
    companyName: me?.companyName ?? undefined,
    basePath: '/company',
    backTo: '/dashboard',
  }
}
