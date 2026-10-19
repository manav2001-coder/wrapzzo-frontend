import { apiClient } from '@/lib/axiosClient'

export interface CompanyVendor {
  vendorId: string
  vendorName: string
  vendorStatus: 'ACTIVE' | 'SUSPENDED'
}

export async function listCompanyVendors(companyId: string): Promise<CompanyVendor[]> {
  const { data } = await apiClient.get<CompanyVendor[]>(`/api/platform/companies/${companyId}/vendors`)
  return data
}

export async function assignCompanyVendor(companyId: string, vendorId: string): Promise<CompanyVendor[]> {
  const { data } = await apiClient.post<CompanyVendor[]>(`/api/platform/companies/${companyId}/vendors`, { vendorId })
  return data
}

export async function unassignCompanyVendor(companyId: string, vendorId: string): Promise<CompanyVendor[]> {
  const { data } = await apiClient.delete<CompanyVendor[]>(`/api/platform/companies/${companyId}/vendors/${vendorId}`)
  return data
}
