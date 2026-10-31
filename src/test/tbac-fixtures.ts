import type { Role } from '@/api/roles'

/** Shared builders for the roles, users and orders screen tests. */
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
