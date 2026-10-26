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
