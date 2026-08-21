import { authGet, authPost } from './client'

export interface Company {
  id: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  logoUrl: string | null
  createdAt: string
}

interface PresignLogoUploadResponse {
  uploadUrl: string
  key: string
}

export function listCompanies(token: string): Promise<Company[]> {
  return authGet<Company[]>('/api/platform/companies/list', token)
}

export function getCompany(token: string, id: string): Promise<Company> {
  return authGet<Company>(`/api/platform/companies/view/${id}`, token)
}

export function createCompany(token: string, name: string): Promise<Company> {
  return authPost<Company>('/api/platform/companies/add', token, { name })
}

export function updateCompany(token: string, id: string, name: string): Promise<Company> {
  return authPost<Company>(`/api/platform/companies/edit/${id}`, token, { name })
}

export function activateCompany(token: string, id: string): Promise<Company> {
  return authPost<Company>(`/api/platform/companies/activate/${id}`, token)
}

export function deactivateCompany(token: string, id: string): Promise<Company> {
  return authPost<Company>(`/api/platform/companies/deactivate/${id}`, token)
}

/**
 * Presigns an upload URL, PUTs the file straight to S3/MinIO (not through
 * our backend), then tells the backend the object key so it can attach it
 * to the company. Three round trips, but the backend never touches the
 * file's bytes.
 */
export async function uploadCompanyLogo(token: string, id: string, file: File): Promise<Company> {
  const { uploadUrl, key } = await authPost<PresignLogoUploadResponse>(`/api/platform/companies/presignLogo/${id}`, token, {
    contentType: file.type,
  })

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Upload to storage failed with status ${uploadResponse.status}`)
  }

  return authPost<Company>(`/api/platform/companies/attachLogo/${id}`, token, { key })
}
