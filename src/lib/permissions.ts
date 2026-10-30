/**
 * The permission catalogue, mirrored from the backend's `Permission` enum: every grantable action
 * as `module.action`. Gates take {@link PermissionKey}, so a typo or a key the backend renamed is
 * a compile error rather than a menu that silently disappears.
 *
 * Keep in step with `com.wrapzzo.backend.security.Permission` -- the backend refuses to start if
 * its enum and the database disagree, and `permissions.test.ts` pins this list.
 */
export const P = {
  DASHBOARD_VIEW: 'dashboard.view',

  CAMPAIGN_VIEW: 'campaign.view',
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_EDIT: 'campaign.edit',
  CAMPAIGN_PUBLISH: 'campaign.publish',

  CAMPAIGN_ENTRY_SUBMIT: 'campaign_entry.submit',
  CAMPAIGN_ENTRY_VIEW: 'campaign_entry.view',

  REQUEST_CREATE: 'request.create',
  REQUEST_APPROVE: 'request.approve',

  PRODUCT_VIEW: 'product.view',

  ORDER_VIEW: 'order.view',
  ORDER_ARTWORK_REVIEW: 'order.artwork_review',
  ORDER_ARTWORK_FINAL: 'order.artwork_final',

  RECIPIENT_VIEW: 'recipient.view',
  RECIPIENT_CREATE: 'recipient.create',
  RECIPIENT_EDIT: 'recipient.edit',

  RECIPIENT_LIST_MANAGE: 'recipient_list.manage',
  RECIPIENT_LIST_APPROVE: 'recipient_list.approve',

  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',

  ACCESS_VIEW: 'access.view',
  ACCESS_EDIT: 'access.edit',

  COMPANY_VENDOR_VIEW: 'company_vendor.view',
  COMPANY_VENDOR_ADD: 'company_vendor.add',

  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_SETUP: 'warehouse.setup',
  WAREHOUSE_OPERATE: 'warehouse.operate',

  MENU_EDIT: 'menu.edit',

  PLATFORM_COMPANY_VIEW: 'platform_company.view',
  PLATFORM_COMPANY_CREATE: 'platform_company.create',
  PLATFORM_COMPANY_EDIT: 'platform_company.edit',
  PLATFORM_COMPANY_STATUS: 'platform_company.status',
  PLATFORM_COMPANY_CONFIGURE: 'platform_company.configure',

  PLATFORM_VENDOR_VIEW: 'platform_vendor.view',
  PLATFORM_VENDOR_CREATE: 'platform_vendor.create',
  PLATFORM_VENDOR_EDIT: 'platform_vendor.edit',
  PLATFORM_VENDOR_STATUS: 'platform_vendor.status',

  PLATFORM_PRODUCT_VIEW: 'platform_product.view',
  PLATFORM_PRODUCT_CREATE: 'platform_product.create',
  PLATFORM_PRODUCT_EDIT: 'platform_product.edit',
  PLATFORM_PRODUCT_STATUS: 'platform_product.status',

  PLATFORM_ORDER_VIEW: 'platform_order.view',
  PLATFORM_ORDER_MANAGE: 'platform_order.manage',
} as const

export type PermissionKey = (typeof P)[keyof typeof P]

/** What a gate asks for: one key, or any-of (all-of with `requireAll`) several. `undefined` = ungated. */
export type PermissionRequirement = PermissionKey | readonly PermissionKey[]

/** The action every module is read with; granting any other action of a module implies it. */
export const VIEW_ACTION = 'view'
