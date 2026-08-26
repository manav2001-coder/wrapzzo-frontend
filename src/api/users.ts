import { apiClient } from '@/lib/axiosClient'

export interface BulkImportUserRow {
  name: string
  email: string
  mobile: string
  designation: string
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
  orgUnitName: string | null
  roleId: string
  roleName: string
  createdAt: string
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
