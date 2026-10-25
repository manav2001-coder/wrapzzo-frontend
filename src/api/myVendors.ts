import type { CompanyVendor } from '@/api/companyVendors'
import { apiClient } from '@/lib/axiosClient'

export interface AddMyVendorInput {
  name: string
  contactEmail: string
  contactPhone?: string
  /** Null/omitted = this vendor serves the whole company. Set = scoped to one org unit and everything beneath it. */
  orgUnitId?: string | null
}

export async function listMyVendors(): Promise<CompanyVendor[]> {
  const { data } = await apiClient.get<CompanyVendor[]>('/api/company/vendors')
  return data
}

export async function addMyVendor(input: AddMyVendorInput): Promise<CompanyVendor[]> {
  const { data } = await apiClient.post<CompanyVendor[]>('/api/company/vendors', input)
  return data
}
