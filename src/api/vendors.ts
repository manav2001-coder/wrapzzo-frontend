import { authGet, authPost } from './client'

export interface Vendor {
  id: string
  name: string
  contactEmail: string
  contactPhone: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
}

export interface AddVendorResult {
  vendor: Vendor
  temporaryPassword: string | null
}

export function listVendors(token: string): Promise<Vendor[]> {
  return authGet<Vendor[]>('/api/platform/vendors/list', token)
}

export function getVendor(token: string, id: string): Promise<Vendor> {
  return authGet<Vendor>(`/api/platform/vendors/view/${id}`, token)
}

export function addVendor(
  token: string,
  input: { name: string; contactEmail: string; contactPhone?: string },
): Promise<AddVendorResult> {
  return authPost<AddVendorResult>('/api/platform/vendors/add', token, input)
}

export function editVendor(token: string, id: string, input: { name: string; contactPhone?: string }): Promise<Vendor> {
  return authPost<Vendor>(`/api/platform/vendors/edit/${id}`, token, input)
}

export function suspendVendor(token: string, id: string): Promise<Vendor> {
  return authPost<Vendor>(`/api/platform/vendors/suspend/${id}`, token)
}

export function reactivateVendor(token: string, id: string): Promise<Vendor> {
  return authPost<Vendor>(`/api/platform/vendors/reactivate/${id}`, token)
}
