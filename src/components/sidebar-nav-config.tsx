import {
  BadgeCheck,
  Blocks,
  Building2,
  Contact,
  Gift,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PlusCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Store,
  Truck,
  Users,
  Warehouse,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The nav tree's SOURCE, in MobixFL's shape.
 *
 *  - `titleKey` is a translation key, not a display string: the tree is module-level data, so a
 *    literal title could never respond to a language change.
 *  - `permission` says what the destination requires (any-of for an array). `useNav` filters on
 *    it, so nobody is shown an entry to a screen that answers 403. The API is still the control.
 *
 * Wrappzo has three audiences, each with its own tree: platform staff (Admin), company users,
 * and vendors (a separate login with a fixed capability set, so their tree is ungated).
 */
export interface NavSource {
  id: string
  titleKey: string
  type: 'group' | 'collapse' | 'item'
  icon?: LucideIcon
  url?: string
  end?: boolean
  /** Any-of. Omit for an entry everyone in this portal may see. */
  permission?: string | string[]
  /** Also shown to anyone with direct reports, whatever their keys (a manager's own approvals). */
  forManagers?: boolean
  children?: NavSource[]
}

/**
 * Developer-only. The kit showcase renders every component against dummy data and is not a
 * product screen, so it is gated on the build rather than a permission key. The route stays
 * registered so the URL still works if someone types it.
 */
const COMPONENTS_ENTRY: NavSource[] = import.meta.env.DEV
  ? [{ id: 'components', titleKey: 'nav.components', type: 'item', url: '/components', icon: Blocks }]
  : []

const GENERAL: NavSource = {
  id: 'general',
  titleKey: 'nav.general',
  type: 'group',
  children: [
    { id: 'settings', titleKey: 'nav.settings', type: 'item', url: '/settings', end: true, icon: Settings },
    ...COMPONENTS_ENTRY,
  ],
}

/** Wrappzo platform staff. */
export const ADMIN_NAV: NavSource[] = [
  {
    id: 'admin',
    titleKey: 'nav.admin',
    type: 'group',
    children: [
      { id: 'companies', titleKey: 'nav.companies', type: 'item', url: '/admin/companies', icon: Building2, permission: 'company.manage' },
      { id: 'vendors', titleKey: 'nav.vendors', type: 'item', url: '/admin/vendors', icon: Truck, permission: 'vendor.manage' },
      { id: 'gift-catalogue', titleKey: 'nav.giftCatalogue', type: 'item', url: '/admin/gifts', icon: Gift, permission: 'gift.manage' },
      { id: 'platform-orders', titleKey: 'nav.orders', type: 'item', url: '/admin/orders', icon: ShoppingBag, permission: 'order.manage' },
      { id: 'access-control', titleKey: 'nav.accessControl', type: 'item', url: '/admin/access-control', icon: ShieldCheck, permission: 'role.manage' },
    ],
  },
  GENERAL,
]

/**
 * A company's own users. Approvals, Orders and Users are siblings of the Campaigns branch rather
 * than inside it: they are independent workflows, not part of building or running a campaign.
 */
export const COMPANY_NAV: NavSource[] = [
  {
    id: 'workspace',
    titleKey: 'nav.workspace',
    type: 'group',
    children: [
      { id: 'dashboard', titleKey: 'nav.dashboard', type: 'item', url: '/dashboard', end: true, icon: LayoutDashboard, permission: 'dashboard.view' },
      {
        id: 'campaigns',
        titleKey: 'nav.campaigns',
        type: 'collapse',
        icon: Megaphone,
        children: [
          { id: 'campaigns-create', titleKey: 'nav.campaignsCreate', type: 'item', url: '/campaigns', icon: PlusCircle, permission: 'campaign.manage' },
          { id: 'campaigns-manage', titleKey: 'nav.campaignsManage', type: 'item', url: '/my-campaigns', icon: ListChecks, permission: 'campaign.submit' },
        ],
      },
      { id: 'quick-gift', titleKey: 'nav.quickGift', type: 'item', url: '/quick-gift', icon: Zap, permission: 'quickgift.create' },
      { id: 'gift-store', titleKey: 'nav.giftStore', type: 'item', url: '/gift-store', icon: Store, permission: 'quickgift.create' },
      { id: 'recipients', titleKey: 'nav.recipients', type: 'item', url: '/recipients', icon: Contact, permission: 'recipient.manage' },
      { id: 'my-doctors', titleKey: 'nav.myDoctors', type: 'item', url: '/my-doctors', icon: Stethoscope, permission: ['quickgift.create', 'recipient.manage'] },
      { id: 'approvals', titleKey: 'nav.approvals', type: 'item', url: '/approvals', icon: BadgeCheck, permission: ['campaign.manage', 'campaign.approve', 'recipient.approve', 'order.design.final'], forManagers: true },
      {
        id: 'company-orders',
        titleKey: 'nav.orders',
        type: 'item',
        url: '/orders',
        icon: ShoppingBag,
        permission: ['campaign.manage', 'order.track', 'order.design.review'],
      },
      { id: 'company-users', titleKey: 'nav.users', type: 'item', url: '/company/users', icon: Users, permission: 'user.manage' },
      { id: 'company-vendors', titleKey: 'nav.myVendors', type: 'item', url: '/company/vendors', icon: Truck, permission: 'company.vendor.manage' },
      { id: 'warehouses', titleKey: 'nav.warehouses', type: 'item', url: '/warehouses', icon: Warehouse, permission: 'warehouse.manage' },
    ],
  },
  GENERAL,
]

/** A vendor's portal. Every vendor has the same fixed capabilities, so nothing here is gated. */
export const VENDOR_NAV: NavSource[] = [
  {
    id: 'vendor',
    titleKey: 'nav.vendorPortal',
    type: 'group',
    children: [
      { id: 'vendor-home', titleKey: 'nav.vendorHome', type: 'item', url: '/vendor', end: true, icon: LayoutDashboard },
      { id: 'vendor-orders', titleKey: 'nav.vendorOrders', type: 'item', url: '/vendor/orders', icon: ShoppingBag },
      { id: 'vendor-gifts', titleKey: 'nav.vendorGifts', type: 'item', url: '/vendor/gifts', icon: Gift },
      { id: 'vendor-settings', titleKey: 'nav.settings', type: 'item', url: '/vendor/settings', end: true, icon: Settings },
    ],
  },
]
