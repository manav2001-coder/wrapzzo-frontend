import { apiClient } from '@/lib/axiosClient'

export interface Vendor {
  id: string
  displayId: string
  name: string
  contactEmail: string
  contactPhone: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
}

export interface AddVendorInput {
  name: string
  contactEmail: string
  contactPhone?: string
}

export interface EditVendorInput {
  name: string
  contactPhone?: string
}

export async function listVendors(): Promise<Vendor[]> {
  const { data } = await apiClient.get<Vendor[]>('/api/platform/vendors/list')
  return data
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
