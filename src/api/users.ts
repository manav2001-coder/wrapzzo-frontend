import type { OrgUnit } from '@/api/myOrgUnits'
import { apiClient } from '@/lib/axiosClient'

export interface BulkImportUserRow {
  name: string
  email: string
  mobile: string
  designation: string
  /** Name of an active role of the company (see the Roles master). */
  role: string
  employeeCode: string
  reportsToEmail?: string
  orgUnitPath: string[]
}

export interface CompanyUser {
  id: string
  name: string
  email: string
  mobile: string | null
  designation: string | null
  employeeCode: string | null
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  reportsToName: string | null
  orgUnitId: string | null
  orgUnitName: string | null
  /** Placed at the company itself: sees every record in the company. */
  companyWide: boolean
  /** Units the user covers beyond their own -- what they see widens to these too. */
  extraOrgUnits: { id: string; name: string }[]
  roleId: string
  roleName: string
  createdAt: string
  addedOn?: string | null
  addedByName?: string | null
  updatedOn?: string | null
  updatedByName?: string | null
}

export interface BulkImportUsersResult {
  createdCount: number
  updatedCount: number
  users: CompanyUser[]
}

export interface BulkImportValidationError {
  error: string
  details: string[]
}

export async function bulkImportUsers(companyId: string, rows: BulkImportUserRow[]): Promise<BulkImportUsersResult> {
  const { data } = await apiClient.post<BulkImportUsersResult>(`/api/platform/companies/${companyId}/users/bulkImport`, { rows })
  return data
}

export async function listCompanyUsers(companyId: string): Promise<CompanyUser[]> {
  const { data } = await apiClient.get<CompanyUser[]>(`/api/platform/companies/${companyId}/users/list`)
  return data
}

export async function makeCompanyAdmin(companyId: string, userId: string): Promise<CompanyUser> {
  const { data } = await apiClient.post<CompanyUser>(`/api/platform/companies/${companyId}/users/${userId}/makeCompanyAdmin`)
  return data
}

export async function changeUserRole(companyId: string, userId: string, roleId: string): Promise<CompanyUser> {
  const { data } = await apiClient.put<CompanyUser>(`/api/platform/companies/${companyId}/users/${userId}/role`, { roleId })
  return data
}

/** The role the person moves to: a company has no default one. */
export async function removeCompanyAdmin(companyId: string, userId: string, roleId: string): Promise<CompanyUser> {
  const { data } = await apiClient.post<CompanyUser>(`/api/platform/companies/${companyId}/users/${userId}/removeCompanyAdmin`, { roleId })
  return data
}

/** Every org unit in the company -- the choices for a user's extra units. */
export async function listCompanyOrgUnits(companyId: string): Promise<OrgUnit[]> {
  const { data } = await apiClient.get<OrgUnit[]>(`/api/platform/companies/${companyId}/orgUnits/list`)
  return data
}

/** Replace-all of the units a user covers beyond their own (empty clears them). */
export async function setExtraOrgUnits(companyId: string, userId: string, orgUnitIds: string[]): Promise<CompanyUser> {
  const { data } = await apiClient.put<CompanyUser>(`/api/platform/companies/${companyId}/users/${userId}/extraOrgUnits`, { orgUnitIds })
  return data
}

/** Place the user at the company itself (sees everything) or back at their own unit. */
export async function setCompanyWide(companyId: string, userId: string, companyWide: boolean): Promise<CompanyUser> {
  const { data } = await apiClient.put<CompanyUser>(`/api/platform/companies/${companyId}/users/${userId}/companyWide`, { companyWide })
  return data
}

export async function deleteUser(companyId: string, userId: string): Promise<void> {
  await apiClient.delete(`/api/platform/companies/${companyId}/users/${userId}`)
}
