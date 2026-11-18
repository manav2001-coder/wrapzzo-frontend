import { apiClient } from '@/lib/axiosClient'
import { putToStorage } from '@/lib/storage-upload'

export interface Company {
  id: string
  displayId: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  logoUrl: string | null
  contactPersonName: string | null
  contactEmail: string | null
  contactMobile: string | null
  gstin: string | null
  pan: string | null
  registrationNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  pincode: string | null
  notes: string | null
  createdAt: string
  addedOn?: string | null
  addedByName?: string | null
  updatedOn?: string | null
  updatedByName?: string | null
}

/** What onboarding a company takes: its name, and an optional profile. Anything left out is cleared. */
export interface CompanyInput {
  name: string
  contactPersonName?: string
  contactEmail?: string
  contactMobile?: string
  gstin?: string
  pan?: string
  registrationNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  notes?: string
}

interface PresignLogoUploadResponse {
  uploadUrl: string
  key: string
}

export async function listCompanies(): Promise<Company[]> {
  const { data } = await apiClient.get<Company[]>('/api/platform/companies/list')
  return data
}

export async function getCompany(id: string): Promise<Company> {
  const { data } = await apiClient.get<Company>(`/api/platform/companies/view/${id}`)
  return data
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const { data } = await apiClient.post<Company>('/api/platform/companies/add', input)
  return data
}

export async function updateCompany(id: string, input: CompanyInput): Promise<Company> {
  const { data } = await apiClient.post<Company>(`/api/platform/companies/edit/${id}`, input)
  return data
}

export async function activateCompany(id: string): Promise<Company> {
  const { data } = await apiClient.post<Company>(`/api/platform/companies/activate/${id}`)
  return data
}

export async function deactivateCompany(id: string): Promise<Company> {
  const { data } = await apiClient.post<Company>(`/api/platform/companies/deactivate/${id}`)
  return data
}

/**
 * Presigns an upload URL, PUTs the file straight to object storage (not
 * through our backend), then tells the backend the object key so it can
 * attach it to the company. Three round trips, but the backend never
 * touches the file's bytes.
 */
export async function uploadCompanyLogo(id: string, file: File): Promise<Company> {
  const { data: presign } = await apiClient.post<PresignLogoUploadResponse>(`/api/platform/companies/presignLogo/${id}`, {
    contentType: file.type,
  })

  await putToStorage(presign.uploadUrl, file, file.type, 'logo')

  const { data } = await apiClient.post<Company>(`/api/platform/companies/attachLogo/${id}`, { key: presign.key })
  return data
}
