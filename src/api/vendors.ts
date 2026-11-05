import { apiClient } from '@/lib/axiosClient'

export interface Vendor {
  id: string
  displayId: string
  name: string
  contactEmail: string
  contactPhone: string | null
  /** The company that added and runs this vendor; null for one that predates ownership. */
  companyName: string | null
  /** Everywhere it serves, one entry per mapping: "Company · Division" or "Company · Whole company". */
  serves: string[]
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

/** Every vendor across all franchises; with a company, only those serving it. Platform staff view; each company runs its own. */
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

export async function getVendor(id: string): Promise<Vendor> {
  const { data } = await apiClient.get<Vendor>(`/api/platform/vendors/view/${id}`)
  return data
}
