import type { Feature } from '@/api/features'
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

export const companyAdmin = (permissions: string[]) => ({
  data: { companyId: 'c-1', companyName: 'Alembic', permissions, companyWide: true, managesTeam: false },
  isLoading: false,
})
