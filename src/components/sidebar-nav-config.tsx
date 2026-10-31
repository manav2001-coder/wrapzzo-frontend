import {
  BadgeCheck,
  ClipboardList,
  KeyRound,
  Layers,
  Link2,
  ShieldHalf,
  UserCog,
  Blocks,
  Building2,
  Contact,
  Gift,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PencilLine,
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
import { P, type PermissionRequirement } from '@/lib/permissions'

/**
 * The nav tree's SOURCE, in MobixFL's shape.
 *
 *  - `titleKey` is a translation key, not a display string: the tree is module-level data, so a
 *    literal title could never respond to a language change.
 *  - `permission` says what the destination requires (any-of for an array) -- the screen's VIEW
 *    action; buttons inside it gate on the specific action. It matches the route guard in
 *    AppRoutes, so nobody is shown an entry to a screen that answers 403. The API is the control.
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
  permission?: PermissionRequirement
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

/** Masters: the roles and users a company is made of -- roles first, since every user is given one. */
const MASTERS_NAV: NavSource = {
  id: 'masters',
  titleKey: 'nav.masters',
  type: 'collapse',
  icon: Users,
  children: [
    { id: 'masters-roles', titleKey: 'nav.roles', type: 'item', url: '/masters/roles', icon: BadgeCheck, permission: P.ROLE_VIEW },
    { id: 'masters-users', titleKey: 'nav.users', type: 'item', url: '/masters/users', icon: Users, permission: P.USER_VIEW },
  ],
}

/**
 * Access control (TBAC), the same menu for platform staff and company admins: roles first, then
 * the features and templates they are built from, then who gets what (roles and users are in Masters).
 */
const TBAC_NAV: NavSource = {
  id: 'group-tbac',
  titleKey: 'nav.accessControl',
  type: 'group',
  children: [
    {
      id: 'management',
      titleKey: 'nav.tbac',
      type: 'collapse',
      icon: ShieldHalf,
      children: [
        { id: 'feature-master', titleKey: 'nav.featureMaster', type: 'item', url: '/tbac/feature-master', icon: KeyRound, permission: P.TBAC_FEATURE_MASTER_VIEW },
        { id: 'template-master', titleKey: 'nav.templateMaster', type: 'item', url: '/tbac/template-master', end: true, icon: Layers, permission: P.TBAC_TEMPLATE_MASTER_VIEW },
        {
          id: 'assignments',
          titleKey: 'nav.assignments',
          type: 'collapse',
          icon: ClipboardList,
          children: [
            { id: 'features-to-template-manage', titleKey: 'nav.featuresToTemplate', type: 'item', url: '/tbac/features-to-template', end: true, icon: KeyRound, permission: P.TBAC_FEATURES_TO_TEMPLATE_MANAGE },
            { id: 'template-to-template-manage', titleKey: 'nav.templatesToTemplate', type: 'item', url: '/tbac/templates-to-template', end: true, icon: Link2, permission: P.TBAC_TEMPLATES_TO_TEMPLATE_MANAGE },
            { id: 'user-templates', titleKey: 'nav.templatesToUser', type: 'item', url: '/tbac/assignments/users', end: true, icon: UserCog, permission: P.TBAC_USER_TEMPLATE_MANAGE },
            { id: 'role-templates', titleKey: 'nav.templatesToRole', type: 'item', url: '/tbac/assignments/roles', end: true, icon: ShieldCheck, permission: P.TBAC_ROLE_TEMPLATE_MANAGE },
          ],
        },
      ],
    },
  ],
}

/**
 * The masters platform staff keep: the companies and vendors the platform serves, then -- per
 * company -- its roles and users. (A company's own admins see just roles and users.)
 */
const ADMIN_MASTERS_NAV: NavSource = {
  ...MASTERS_NAV,
  children: [
    { id: 'companies', titleKey: 'nav.companies', type: 'item', url: '/admin/companies', icon: Building2, permission: P.PLATFORM_COMPANY_VIEW },
    { id: 'vendors', titleKey: 'nav.vendors', type: 'item', url: '/admin/vendors', icon: Truck, permission: P.PLATFORM_VENDOR_VIEW },
    ...(MASTERS_NAV.children ?? []),
  ],
}

/** Wrappzo platform staff. */
export const ADMIN_NAV: NavSource[] = [
  {
    id: 'admin',
    titleKey: 'nav.admin',
    type: 'group',
    children: [
      { id: 'gift-catalogue', titleKey: 'nav.giftCatalogue', type: 'item', url: '/admin/gifts', icon: Gift, permission: P.PLATFORM_PRODUCT_VIEW },
      { id: 'platform-orders', titleKey: 'nav.orders', type: 'item', url: '/admin/orders', icon: ShoppingBag, permission: P.PLATFORM_ORDER_VIEW },
    ],
  },
  ADMIN_MASTERS_NAV,
  TBAC_NAV,
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
      { id: 'dashboard', titleKey: 'nav.dashboard', type: 'item', url: '/dashboard', end: true, icon: LayoutDashboard, permission: P.DASHBOARD_VIEW },
      {
        id: 'campaigns',
        titleKey: 'nav.campaigns',
        type: 'collapse',
        icon: Megaphone,
        children: [
          { id: 'campaigns-create', titleKey: 'nav.campaignsCreate', type: 'item', url: '/campaigns', icon: PlusCircle, permission: P.CAMPAIGN_VIEW },
          { id: 'campaigns-manage', titleKey: 'nav.campaignsManage', type: 'item', url: '/my-campaigns', icon: ListChecks, permission: P.CAMPAIGN_ENTRY_SUBMIT },
        ],
      },
      { id: 'quick-gift', titleKey: 'nav.quickGift', type: 'item', url: '/quick-gift', icon: Zap, permission: P.REQUEST_CREATE },
      { id: 'gift-store', titleKey: 'nav.giftStore', type: 'item', url: '/gift-store', icon: Store, permission: P.PRODUCT_VIEW },
      { id: 'recipients', titleKey: 'nav.recipients', type: 'item', url: '/recipients', icon: Contact, permission: P.RECIPIENT_VIEW },
      { id: 'my-doctors', titleKey: 'nav.myDoctors', type: 'item', url: '/my-doctors', icon: Stethoscope, permission: [P.RECIPIENT_LIST_MANAGE, P.REQUEST_CREATE] },
      { id: 'approvals', titleKey: 'nav.approvals', type: 'item', url: '/approvals', icon: BadgeCheck, permission: [P.REQUEST_APPROVE, P.RECIPIENT_LIST_APPROVE, P.ORDER_ARTWORK_FINAL], forManagers: true },
      {
        id: 'company-orders',
        titleKey: 'nav.orders',
        type: 'item',
        url: '/orders',
        icon: ShoppingBag,
        permission: P.ORDER_VIEW,
      },
      { id: 'company-vendors', titleKey: 'nav.myVendors', type: 'item', url: '/company/vendors', icon: Truck, permission: P.COMPANY_VENDOR_VIEW },
      { id: 'warehouses', titleKey: 'nav.warehouses', type: 'item', url: '/warehouses', icon: Warehouse, permission: P.WAREHOUSE_VIEW },
      { id: 'menu-names', titleKey: 'nav.menuNames', type: 'item', url: '/company/menu-names', icon: PencilLine, permission: P.MENU_EDIT },
    ],
  },
  MASTERS_NAV,
  TBAC_NAV,
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
