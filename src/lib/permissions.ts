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

  QUICK_GIFT_CREATE: 'quick_gift.create',

  GIFT_STORE_VIEW: 'gift_store.view',

  ORDER_VIEW: 'order.view',
  ORDER_REQUEST_PHOTO: 'order.request_photo',
  ARTWORK_REVIEW: 'artwork.review',
  ARTWORK_FINAL_APPROVE: 'artwork.final_approve',
  /** The Approvals page (manager queue). Not the approval-steps setup, which is ARTWORK_APPROVAL_*. */
  APPROVAL_VIEW: 'approval.view',
  /** Approve or send back a proof at a manager level. The MR's own first review is ARTWORK_REVIEW. */
  APPROVAL_DECIDE: 'approval.decide',
  ARTWORK_APPROVAL_VIEW: 'artwork_approval.view',
  ARTWORK_APPROVAL_CONFIGURE: 'artwork_approval.configure',

  DOCTOR_VIEW: 'doctor.view',
  DOCTOR_CREATE: 'doctor.create',
  DOCTOR_EDIT: 'doctor.edit',
  DOCTOR_REMOVE: 'doctor.remove',
  DOCTOR_IMPORT: 'doctor.import',
  DOCTOR_APPROVE: 'doctor.approve',

  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',

  ROLE_VIEW: 'role.view',
  ROLE_EDIT: 'role.edit',

  // Access Control, as MobixFL has it: a key per screen and action. `.manage` opens an assignment
  // screen, `.assignment` writes in it, so assignments can be audited without being changed.
  FEATURE_MASTER_VIEW: 'feature_master.view',
  FEATURE_MASTER_ADD: 'feature_master.add',
  FEATURE_MASTER_EDIT: 'feature_master.edit',
  TEMPLATE_MASTER_VIEW: 'template_master.view',
  TEMPLATE_MASTER_ADD: 'template_master.add',
  TEMPLATE_MASTER_EDIT: 'template_master.edit',
  FEATURES_TO_TEMPLATE_VIEW: 'features_to_template.view',
  FEATURES_TO_TEMPLATE_ASSIGN: 'features_to_template.assign',
  TEMPLATES_TO_TEMPLATE_VIEW: 'templates_to_template.view',
  TEMPLATES_TO_TEMPLATE_ASSIGN: 'templates_to_template.assign',
  USER_TEMPLATE_VIEW: 'user_template.view',
  USER_TEMPLATE_ASSIGN: 'user_template.assign',
  USER_TEMPLATE_BULK_ASSIGN: 'user_template.bulk_assign',
  ROLE_TEMPLATE_VIEW: 'role_template.view',
  ROLE_TEMPLATE_ASSIGN: 'role_template.assign',

  /** May see which vendor makes an order. Not the Vendors page, which is COMPANY_VENDOR_VIEW. */
  VENDOR_IDENTITY_VIEW: 'vendor_identity.view',
  COMPANY_VENDOR_VIEW: 'company_vendor.view',
  COMPANY_VENDOR_ADD: 'company_vendor.add',
  COMPANY_VENDOR_ASSIGN: 'company_vendor.assign',
  COMPANY_VENDOR_EDIT: 'company_vendor.edit',
  COMPANY_VENDOR_STATUS: 'company_vendor.status',

  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_SETUP: 'warehouse.setup',
  WAREHOUSE_OPERATE: 'warehouse.operate',

  PLATFORM_COMPANY_VIEW: 'platform_company.view',
  PLATFORM_COMPANY_CREATE: 'platform_company.create',
  PLATFORM_COMPANY_EDIT: 'platform_company.edit',
  PLATFORM_COMPANY_STATUS: 'platform_company.status',
  PLATFORM_COMPANY_CONFIGURE: 'platform_company.configure',

  PLATFORM_VENDOR_VIEW: 'platform_vendor.view',

  PLATFORM_GIFT_VIEW: 'platform_gift.view',
  PLATFORM_GIFT_CREATE: 'platform_gift.create',
  PLATFORM_GIFT_EDIT: 'platform_gift.edit',
  PLATFORM_GIFT_STATUS: 'platform_gift.status',

  PLATFORM_ORDER_VIEW: 'platform_order.view',
  PLATFORM_ORDER_MANAGE: 'platform_order.manage',

  PLATFORM_DASHBOARD_VIEW: 'platform_dashboard.view',

  PLATFORM_JOBS_VIEW: 'platform_jobs.view',
  PLATFORM_JOBS_MANAGE: 'platform_jobs.manage',

  PLATFORM_MENU_CONFIG_VIEW: 'platform_menu_config.view',
  PLATFORM_MENU_CONFIG_EDIT: 'platform_menu_config.edit',
} as const

export type PermissionKey = (typeof P)[keyof typeof P]

/** What a gate asks for: one key, or any-of (all-of with `requireAll`) several. `undefined` = ungated. */
export type PermissionRequirement = PermissionKey | readonly PermissionKey[]

/** The action every module is read with; granting any other action of a module implies it. */
export const VIEW_ACTION = 'view'
