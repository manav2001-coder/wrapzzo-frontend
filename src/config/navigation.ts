export interface NavLink {
  type: 'link'
  label: string
  to: string
  icon: string
  end?: boolean
  /** Hide this link unless the current user holds this access-control key (see useHasPermission). Omit to always show. */
  requiresPermission?: string
}

/** A collapsible submenu nested one level inside a NavModule -- e.g. "Campaign Module" holding Create/Manage. */
export interface NavGroup {
  type: 'group'
  /** Must be globally unique across all modules -- reused as the sidebar's expand/collapse state key. */
  key: string
  label: string
  icon: string
  items: NavLink[]
}

export type NavEntry = NavLink | NavGroup

export interface NavModule {
  key: string
  label: string
  icon: string
  /**
   * When true, this module renders with no wrapping header/accordion of its own -- its
   * entries sit directly at the sidebar's top level. Used when there's only one module
   * to show (the company-facing side has just this one), so a labeled outer accordion
   * around everything would be a redundant extra click with nothing to actually group.
   */
  flat?: boolean
  items: NavEntry[]
}

const ADMIN_MODULE: NavModule = {
  key: 'admin',
  label: 'Admin',
  icon: 'pi-shield',
  items: [
    { type: 'link', label: 'Companies', to: '/admin/companies', icon: 'pi-building', requiresPermission: 'company.manage' },
    { type: 'link', label: 'Vendors', to: '/admin/vendors', icon: 'pi-truck', requiresPermission: 'vendor.manage' },
    { type: 'link', label: 'Gift Store', to: '/admin/gifts', icon: 'pi-gift', requiresPermission: 'gift.manage' },
    { type: 'link', label: 'Orders', to: '/admin/orders', icon: 'pi-shopping-bag', requiresPermission: 'order.manage' },
    { type: 'link', label: 'Access Control', to: '/admin/access-control', icon: 'pi-lock', requiresPermission: 'role.manage' },
  ],
}

/**
 * Flat (no "Wrappzo" wrapper) -- "Campaigns" is its own collapsible group holding
 * Create (-> the full campaign list/creation surface, /campaigns) and Manage (-> the
 * MR's own day-to-day board of what they're in the audience of, /my-campaigns).
 * Approvals and Orders are deliberately siblings of that group, not nested inside it --
 * they're their own independent workflows, not part of building/running a campaign.
 */
const CAMPAIGNS_MODULE: NavModule = {
  key: 'campaigns',
  label: 'Campaigns',
  icon: 'pi-megaphone',
  flat: true,
  items: [
    {
      type: 'group',
      key: 'campaigns:campaignsGroup',
      label: 'Campaigns',
      icon: 'pi-megaphone',
      items: [
        { type: 'link', label: 'Create', to: '/campaigns', icon: 'pi-plus-circle', requiresPermission: 'campaign.manage' },
        { type: 'link', label: 'Manage', to: '/my-campaigns', icon: 'pi-briefcase', requiresPermission: 'campaign.submit' },
      ],
    },
    { type: 'link', label: 'Approvals', to: '/approvals', icon: 'pi-check-square', requiresPermission: 'campaign.manage' },
    { type: 'link', label: 'Orders', to: '/orders', icon: 'pi-shopping-bag', requiresPermission: 'campaign.manage' },
  ],
}

/**
 * Only the superadmin sees the Admin module -- everyone else sees the company-facing
 * Campaigns module. See config/auth.ts; this is a nav-visibility convenience only, not
 * the security boundary. Adding a future module (Bulk Gifting, Quick Gift, Gift Store
 * for companies) is just appending to CAMPAIGNS_MODULE.items plus its routes in
 * AppRoutes -- the sidebar and topbar pick it up automatically.
 */
export function getNavModules(superAdmin: boolean): NavModule[] {
  return superAdmin ? [ADMIN_MODULE] : [CAMPAIGNS_MODULE]
}
