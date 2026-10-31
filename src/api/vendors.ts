import { apiClient } from '@/lib/axiosClient'

export interface Vendor {
  id: string
  displayId: string
  name: string
  contactEmail: string
  contactPhone: string | null
  /** Percentage, e.g. 12.5 means 12.5%. */
  markupFees: number | null
  /** Percentage, e.g. 12.5 means 12.5%. */
  commission: number | null
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  addedOn?: string | null
  addedByName?: string | null
  updatedOn?: string | null
  updatedByName?: string | null
}

export interface AddVendorInput {
  name: string
  contactEmail: string
  contactPhone?: string
  markupFees?: number
  commission?: number
}

export interface EditVendorInput {
  name: string
  contactPhone?: string
  markupFees?: number
  commission?: number
}

/** Every vendor; with a company, only those serving it (in whole or in any of its org units). */
export async function listVendors(companyId?: string | null): Promise<Vendor[]> {
  const { data } = await apiClient.get<Vendor[]>('/api/platform/vendors/list', { params: companyId ? { companyId } : undefined })
  return data
}

/** One company a vendor serves: the whole company (no org units) or only the org units named. */
export interface CompanyCoverage {
  companyId: string
  companyName?: string
  orgUnitIds: string[]
}

export async function getVendorCoverage(id: string): Promise<CompanyCoverage[]> {
  const { data } = await apiClient.get<{ companies: CompanyCoverage[] }>(`/api/platform/vendors/${id}/coverage`)
  return data.companies
}

/** Replaces where the vendor serves; whatever it served that is not listed is removed. */
export async function replaceVendorCoverage(id: string, companies: CompanyCoverage[]): Promise<CompanyCoverage[]> {
  const { data } = await apiClient.put<{ companies: CompanyCoverage[] }>(`/api/platform/vendors/${id}/coverage`, {
    companies: companies.map(({ companyId, orgUnitIds }) => ({ companyId, orgUnitIds })),
  })
  return data.companies
}

export async function getVendor(id: string): Promise<Vendor> {
  const { data } = await apiClient.get<Vendor>(`/api/platform/vendors/view/${id}`)
  return data
}

/** No password here -- the vendor sets their own via the invite email we send. */
export async function addVendor(input: AddVendorInput): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>('/api/platform/vendors/add', input)
  return data
}

/** For when the original invite email was lost or its link expired. */
export async function resendVendorInvite(id: string): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>(`/api/platform/vendors/resendInvite/${id}`)
  return data
}

export async function editVendor(id: string, input: EditVendorInput): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>(`/api/platform/vendors/edit/${id}`, input)
  return data
}

export async function suspendVendor(id: string): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>(`/api/platform/vendors/suspend/${id}`)
  return data
}

export async function reactivateVendor(id: string): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>(`/api/platform/vendors/reactivate/${id}`)
  return data
}
