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

/** A vendor the company admin may map -- name only. */
export interface AvailableVendor {
  id: string
  name: string
}

export async function listAvailableVendors(): Promise<AvailableVendor[]> {
  const { data } = await apiClient.get<AvailableVendor[]>('/api/company/vendors/available')
  return data
}

/** Where one vendor serves in this company: the whole company, or exactly these org units (a unit covers everything beneath it). */
export interface VendorCoverageInput {
  wholeCompany: boolean
  orgUnitIds: string[]
}

export async function setMyVendorCoverage(vendorId: string, input: VendorCoverageInput): Promise<CompanyVendor[]> {
  const { data } = await apiClient.put<CompanyVendor[]>(`/api/company/vendors/${vendorId}/coverage`, input)
  return data
}

/** Takes a vendor off the company: every mapping it has here. */
export async function removeMyVendor(vendorId: string): Promise<CompanyVendor[]> {
  const { data } = await apiClient.delete<CompanyVendor[]>(`/api/company/vendors/${vendorId}`)
  return data
}
