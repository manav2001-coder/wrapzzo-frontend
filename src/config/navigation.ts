export interface NavItem {
  label: string
  to: string
  icon: string
  end?: boolean
}

export interface NavModule {
  key: string
  label: string
  icon: string
  items: NavItem[]
}

const ADMIN_MODULE: NavModule = {
  key: 'admin',
  label: 'Admin',
  icon: 'pi-shield',
  items: [
    { label: 'Companies', to: '/admin/companies', icon: 'pi-building' },
    { label: 'Vendors', to: '/admin/vendors', icon: 'pi-truck' },
    { label: 'Gift Store', to: '/admin/gifts', icon: 'pi-gift' },
    { label: 'Orders', to: '/admin/orders', icon: 'pi-shopping-bag' },
    { label: 'Access Control', to: '/admin/access-control', icon: 'pi-lock' },
  ],
}

const CAMPAIGNS_MODULE: NavModule = {
  key: 'campaigns',
  label: 'Wrappzo',
  icon: 'pi-megaphone',
  items: [
    { label: 'Campaigns', to: '/campaigns', icon: 'pi-megaphone' },
    { label: 'My Campaigns', to: '/my-campaigns', icon: 'pi-user' },
    { label: 'Approvals', to: '/approvals', icon: 'pi-check-square' },
    { label: 'Orders', to: '/orders', icon: 'pi-shopping-bag' },
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
