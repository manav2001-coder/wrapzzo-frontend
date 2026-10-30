import { apiClient } from '@/lib/axiosClient'

export type CompanyFeatureKey = 'WAREHOUSE_LOGISTICS' | 'MARKETING_DESIGN_APPROVAL' | 'DIRECT_VENDOR_ORDERING'

export interface CompanyFeatureFlag {
  flagKey: CompanyFeatureKey
  displayName: string
  description: string
  enabled: boolean
}

export async function listCompanyFeatureFlags(companyId: string): Promise<CompanyFeatureFlag[]> {
  const { data } = await apiClient.get<CompanyFeatureFlag[]>(`/api/platform/companies/${companyId}/features`)
  return data
}

export async function setCompanyFeatureFlag(companyId: string, flagKey: CompanyFeatureKey, enabled: boolean): Promise<CompanyFeatureFlag[]> {
  const { data } = await apiClient.post<CompanyFeatureFlag[]>(`/api/platform/companies/${companyId}/features`, { flagKey, enabled })
  return data
}

/** With Senior Artwork Approval on: how many managers above the MR sign off on artwork, 1-5. */
export async function getArtworkApprovalLevels(companyId: string): Promise<number> {
  const { data } = await apiClient.get<{ levels: number }>(`/api/platform/companies/${companyId}/features/artwork-approval-levels`)
  return data.levels
}

export async function setArtworkApprovalLevels(companyId: string, levels: number): Promise<number> {
  const { data } = await apiClient.put<{ levels: number }>(`/api/platform/companies/${companyId}/features/artwork-approval-levels`, { levels })
  return data.levels
}
