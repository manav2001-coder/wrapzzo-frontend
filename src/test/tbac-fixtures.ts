import type { Feature } from '@/api/features'
import type { Role } from '@/api/roles'
import type { AccessTemplate } from '@/api/templates'

/** Shared builders for the TBAC screen tests. */
export const feature = (id: string, module: string, action: string, category: string, over: Partial<Feature> = {}): Feature => ({
  id,
  key: `${module}.${action}`,
  module,
  action,
  name: action[0].toUpperCase() + action.slice(1),
  description: null,
  category,
  companyAssignable: true,
  registered: true,
  active: true,
  sortOrder: 0,
  ...over,
})

export const template = (over: Partial<AccessTemplate> = {}): AccessTemplate => ({
  id: 't-1',
  companyId: 'c-1',
  name: 'Zone access',
  description: null,
  active: true,
  system: false,
  accessControlIds: [],
  referencedTemplateIds: [],
  effectiveAccessControlIds: [],
  roleCount: 0,
  userCount: 0,
  ...over,
})

export const role = (over: Partial<Role> = {}): Role => ({
  id: 'r-1',
  name: 'Zonal Head',
  description: null,
  active: true,
  protectedRole: false,
  userCount: 2,
  templateIds: [],
  ...over,
})

export const companyAdmin = (permissions: string[]) => ({
  data: { companyId: 'c-1', companyName: 'Alembic', permissions, companyWide: true, managesTeam: false },
  isLoading: false,
})

export const platformStaff = (permissions: string[]) => ({
  data: { companyId: null, companyName: null, permissions, companyWide: true, managesTeam: false },
  isLoading: false,
})
