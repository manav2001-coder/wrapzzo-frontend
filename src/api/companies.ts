import { apiClient } from '@/lib/axiosClient'

export interface Company {
  id: string
  displayId: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  logoUrl: string | null
  createdAt: string
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

export async function createCompany(name: string): Promise<Company> {
  const { data } = await apiClient.post<Company>('/api/platform/companies/add', { name })
  return data
}

export async function updateCompany(id: string, name: string): Promise<Company> {
  const { data } = await apiClient.post<Company>(`/api/platform/companies/edit/${id}`, { name })
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

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  const { data } = await apiClient.post<Company>(`/api/platform/companies/attachLogo/${id}`, { key: presign.key })
  return data
}
