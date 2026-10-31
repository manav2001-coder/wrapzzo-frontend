import { ShieldAlert } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { flattenNavItems } from '@/components/nav/nav-types'
import { useNav } from '@/components/nav/use-nav'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissions } from '@/hooks/use-permission'

/**
 * "Home": the first screen of the sidebar this user actually sees. Sign-in, the logo, `/` and every
 * wrong-side bounce land here, so each role opens on its own first menu rather than on a fixed page
 * that a role without that permission could not open.
 */
export function FirstMenuRedirect() {
  const { t } = useTranslation()
  const { loading } = usePermissions()
  const first = flattenNavItems(useNav()).find((item) => item.url)

  if (first?.url) return <Navigate to={first.url} replace />
  if (loading) return <Skeleton className="m-6 h-40" />
  return <EmptyState icon={ShieldAlert} title={t('permission.accessDenied')} description={t('permission.accessDeniedBody')} />
}
