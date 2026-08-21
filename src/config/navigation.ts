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

/**
 * Adding a new module (e.g. a future "Reports" or "Catalogue" surface) is
 * just appending an entry here plus its routes in AppRoutes -- the sidebar
 * and topbar pick it up automatically.
 */
export const NAV_MODULES: NavModule[] = [
  {
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
  },
]
