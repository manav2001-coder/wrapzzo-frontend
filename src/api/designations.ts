import { apiClient } from '@/lib/axiosClient'

export interface DesignationAccess {
  designation: string
  accessControlIds: string[]
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
