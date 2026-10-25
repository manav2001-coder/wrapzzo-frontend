import { apiClient } from '@/lib/axiosClient'

/** orgUnitId/orgUnitName null = this mapping is company-wide, visible to every org unit. */
export interface CompanyVendor {
  mappingId: string
  vendorId: string
  vendorName: string
  vendorStatus: 'ACTIVE' | 'SUSPENDED'
  orgUnitId: string | null
  orgUnitName: string | null
}

export async function listCompanyVendors(companyId: string): Promise<CompanyVendor[]> {
  const { data } = await apiClient.get<CompanyVendor[]>(`/api/platform/companies/${companyId}/vendors`)
  return data
}

export async function assignCompanyVendor(companyId: string, vendorId: string, orgUnitId?: string | null): Promise<CompanyVendor[]> {
  const { data } = await apiClient.post<CompanyVendor[]>(`/api/platform/companies/${companyId}/vendors`, { vendorId, orgUnitId: orgUnitId ?? null })
  return data
}

export async function unassignCompanyVendor(companyId: string, vendorId: string): Promise<CompanyVendor[]> {
  const { data } = await apiClient.delete<CompanyVendor[]>(`/api/platform/companies/${companyId}/vendors/${vendorId}`)
  return data
}
