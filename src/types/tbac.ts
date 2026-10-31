/**
 * The Access Control shapes -- MobixFL's `@repo/types` template/feature schemas, as plain
 * interfaces over Wrappzo's `/api/tbac` responses.
 */

export interface Template {
  id: string
  /** Null: a system template, shared by every company and changed by platform staff only. */
  companyId: string | null
  name: string
  /** Server-derived on create, never re-derived on rename. */
  templateKey: string
  description: string | null
  icon: string | null
  path: string | null
  active: boolean
  isSystem: boolean
  directFeatureCount?: number
  /** Direct + inherited, resolved through the templates it includes. */
  effectiveFeatureCount?: number
  addedOn?: string | null
  addedByName?: string | null
  updatedOn?: string | null
  updatedByName?: string | null
}

/** A permission key a company has registered. */
export interface Feature {
  id: string
  key: string
  moduleName: string
  actionName: string
  description: string | null
  active: boolean
  isSystem: boolean
  addedOn?: string | null
  addedByName?: string | null
  updatedOn?: string | null
  updatedByName?: string | null
}

export interface EffectiveFeature {
  id: string
  key: string
  moduleName: string
  actionName: string
}

export interface EffectiveFeatures {
  direct: EffectiveFeature[]
  inherited: EffectiveFeature[]
}

export interface AddTemplateReferencesResult {
  added: number
  totalRequested: number
  errors: string[]
}

export interface BulkAssignUserTemplatesResult {
  totalUsersProcessed: number
  successfulUsers: number
  failedUsers: number
  totalAssignmentsCreated: number
  totalAssignmentsSkipped: number
  userResults: { userId: string; userName: string | null; added: number; skipped: number; status: 'success' | 'failed'; error?: string }[]
}

/** A role of a company, as the Templates to Role screens list it. */
export interface Role {
  id: string
  name: string
  description: string | null
  active: boolean
  protectedRole: boolean
  userCount: number
  templateIds: string[]
}

/** A user, as the Templates to User screens list it. */
export interface PublicUser {
  id: string
  name: string
  email: string
  mobile: string | null
  designation: string | null
  employeeCode: string | null
  status: string
  roleId: string
  roleName: string
  orgUnitName: string | null
  /** Always true for a listed user: the screens read it for their Status column. */
  active?: boolean
}
