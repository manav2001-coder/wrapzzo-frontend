import { apiClient } from '@/lib/axiosClient'

/** A role held by people with this designation: how many hold it, and what it grants them. */
export interface DesignationRoleGrant {
  roleName: string
  userCount: number
  accessControlIds: string[]
}

export interface DesignationAccess {
  designation: string
  /** Granted to the designation itself -- the editable part. */
  accessControlIds: string[]
  /** What its people already get from their role(s); shown read-only. */
  roles: DesignationRoleGrant[]
}

export async function listDesignations(companyId: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/api/platform/companies/${companyId}/designations`)
  return data
}

export async function getDesignationAccess(companyId: string, designation: string): Promise<DesignationAccess> {
  const { data } = await apiClient.get<DesignationAccess>(`/api/platform/companies/${companyId}/designations/access`, {
    params: { designation },
  })
  return data
}

export async function replaceDesignationAccess(companyId: string, designation: string, accessControlIds: string[]): Promise<DesignationAccess> {
  const { data } = await apiClient.put<DesignationAccess>(`/api/platform/companies/${companyId}/designations/access`, {
    designation,
    accessControlIds,
  })
  return data
}
