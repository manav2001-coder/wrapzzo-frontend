import { apiClient } from '@/lib/axiosClient'

export interface Role {
  id: string
  name: string
  description: string | null
  active: boolean
  /** Company Admin and Member: the app relies on them by name, so they can't be renamed, deactivated or removed. */
  protectedRole: boolean
  userCount: number
  templateIds: string[]
  addedOn?: string | null
  addedByName?: string | null
  updatedOn?: string | null
  updatedByName?: string | null
}

export interface RoleInput {
  name: string
  description?: string
  active?: boolean
}

const base = (companyId: string) => `/api/platform/companies/${companyId}/roles`

export async function listRoles(companyId: string): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>(base(companyId))
  return data
}

export interface BulkImportRoleRow {
  name: string
  description?: string
}

export interface BulkImportRolesResult {
  createdCount: number
  updatedCount: number
  roles: Role[]
}

export async function bulkImportRoles(companyId: string, rows: BulkImportRoleRow[]): Promise<BulkImportRolesResult> {
  const { data } = await apiClient.post<BulkImportRolesResult>(`${base(companyId)}/bulk-import`, { rows })
  return data
}

export async function createRole(companyId: string, input: RoleInput): Promise<Role> {
  const { data } = await apiClient.post<Role>(base(companyId), input)
  return data
}

export async function updateRole(companyId: string, roleId: string, input: RoleInput): Promise<Role> {
  const { data } = await apiClient.put<Role>(`${base(companyId)}/${roleId}`, input)
  return data
}

export async function deleteRole(companyId: string, roleId: string): Promise<void> {
  await apiClient.delete(`${base(companyId)}/${roleId}`)
}
