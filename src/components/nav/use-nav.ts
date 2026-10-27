import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { usePermissions } from '@/hooks/use-permission'
import { useShell } from '@/components/shell-context'
import { ADMIN_NAV, COMPANY_NAV, VENDOR_NAV, type NavSource } from '@/components/sidebar-nav-config'
import type { NavItemType } from '@/components/nav/nav-types'

interface FilterContext {
  t: (key: string) => string
  can: (permission?: string | string[]) => boolean
  managesTeam?: boolean
}

/**
 * Drops an entry the caller may not open, then recurses, then drops a branch whose children all
 * filtered out -- unless it has a `url` of its own, in which case it is still a destination.
 */
function filterItem(item: NavSource, ctx: FilterContext): NavItemType | null {
  if (!ctx.can(item.permission) && !(item.forManagers && ctx.managesTeam)) return null

  const title = ctx.t(item.titleKey)
  if (item.type === 'item' && !item.children) {
    return { ...item, title, children: undefined }
  }

  const children = (item.children ?? [])
    .map((child) => filterItem(child, ctx))
    .filter((child): child is NavItemType => child !== null)

  if (children.length === 0 && !item.url) return null
  return { ...item, title, children: children.length > 0 ? children : undefined }
}

export function buildNav(items: NavSource[], ctx: FilterContext): NavItemType[] {
  return items.map((item) => filterItem(item, ctx)).filter((item): item is NavItemType => item !== null)
}

/**
 * The nav tree for this session, translated and filtered to what the user may actually reach.
 * The sidebar and the command palette both read it, so the two can never drift.
 *
 * The vendor portal's tree is ungated. For a company/platform user, nothing is shown while the
 * profile is loading OR failed: filtering an empty permission set produces exactly the menu of a
 * user with no access, which is confidently wrong. `SidebarNav` renders the reason instead.
 */
export function useNav(): NavItemType[] {
  const { t } = useTranslation()
  const { portal } = useShell()
  const { can, isPlatformStaff, managesTeam, loading, error } = usePermissions()

  return React.useMemo(() => {
    const translate = (key: string) => t(key)
    if (portal === 'vendor') return buildNav(VENDOR_NAV, { t: translate, can: () => true })
    if (loading || error) return []
    return buildNav(isPlatformStaff ? ADMIN_NAV : COMPANY_NAV, { t: translate, can: (permission) => can(permission), managesTeam })
  }, [t, portal, can, isPlatformStaff, managesTeam, loading, error])
}
