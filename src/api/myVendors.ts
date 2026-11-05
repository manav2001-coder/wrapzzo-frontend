import type { CompanyVendor } from '@/api/companyVendors'
import { apiClient } from '@/lib/axiosClient'

/** Where a vendor serves in this company: the whole company, or exactly these org units (a unit covers everything beneath it). */
export interface VendorCoverageInput {
  wholeCompany: boolean
  orgUnitIds: string[]
}

export interface AddMyVendorInput extends VendorCoverageInput {
  name: string
  contactEmail: string
  contactPhone?: string
}

export async function listMyVendors(): Promise<CompanyVendor[]> {
  const { data } = await apiClient.get<CompanyVendor[]>('/api/company/vendors')
  return data
}

/** Creates the vendor, emails it an invite and maps it to where it serves -- all or nothing. */
export async function addMyVendor(input: AddMyVendorInput): Promise<CompanyVendor[]> {
  const { data } = await apiClient.post<CompanyVendor[]>('/api/company/vendors', input)
  return data
}

export async function setMyVendorCoverage(vendorId: string, input: VendorCoverageInput): Promise<CompanyVendor[]> {
  const { data } = await apiClient.put<CompanyVendor[]>(`/api/company/vendors/${vendorId}/coverage`, input)
  return data
}

export async function editMyVendor(vendorId: string, input: { name: string; contactPhone?: string }): Promise<CompanyVendor[]> {
  const { data } = await apiClient.put<CompanyVendor[]>(`/api/company/vendors/${vendorId}`, input)
  return data
}

export async function setMyVendorActive(vendorId: string, active: boolean): Promise<CompanyVendor[]> {
  const { data } = await apiClient.post<CompanyVendor[]>(`/api/company/vendors/${vendorId}/${active ? 'reactivate' : 'suspend'}`)
  return data
}

export async function resendMyVendorInvite(vendorId: string): Promise<void> {
  await apiClient.post(`/api/company/vendors/${vendorId}/resend-invite`)
}
