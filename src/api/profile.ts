
import { store } from '@/app/store'
import { setCredentials } from '@/features/auth/authSlice'
import { setVendorCredentials } from '@/features/vendorAuth/vendorAuthSlice'
import { apiClient } from '@/lib/axiosClient'
import { vendorApiClient } from '@/lib/vendorApiClient'
import { putToStorage } from '@/lib/storage-upload'

/** A person signs in on one login, a vendor on another, and each has its own profile endpoints. */
export type ProfileKind = 'user' | 'vendor'

export interface UserProfile {
  name: string
  email: string
  mobile: string | null
  designation: string | null
  employeeCode: string | null
  roleName: string | null
  orgUnitName: string | null
  managerName: string | null
  companyName: string | null
  photoUrl: string | null
}

export interface VendorProfile {
  name: string
  contactEmail: string
  contactPhone: string | null
  vendorNumber: string | null
  photoUrl: string | null
}

interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

const CLIENT = { user: apiClient, vendor: vendorApiClient } as const
const BASE = { user: '/api/profile', vendor: '/api/vendor/profile' } as const

export async function getProfile(kind: 'user'): Promise<UserProfile>
export async function getProfile(kind: 'vendor'): Promise<VendorProfile>
export async function getProfile(kind: ProfileKind): Promise<UserProfile | VendorProfile> {
  const { data } = await CLIENT[kind].get(BASE[kind])
  return data
}

export async function updatePhone(kind: ProfileKind, phone: string): Promise<UserProfile | VendorProfile> {
  const { data } = await CLIENT[kind].put(`${BASE[kind]}/phone`, { phone })
  return data
}

export async function removePhoto(kind: ProfileKind): Promise<UserProfile | VendorProfile> {
  const { data } = await CLIENT[kind].delete(`${BASE[kind]}/photo`)
  return data
}

/**
 * Puts a prepared picture in storage and then tells the server to use it. The browser uploads straight to storage with a
 * short-lived URL; the server only trusts the file after looking at it, so the second call is the one that can refuse it.
 */
export async function uploadPhoto(kind: ProfileKind, picture: Blob): Promise<UserProfile | VendorProfile> {
  const { data: slot } = await CLIENT[kind].post<{ uploadUrl: string; key: string }>(`${BASE[kind]}/photo/presign`, { contentType: picture.type })
  // A raw call: the storage URL is signed, and must not be sent our session token.
  await putToStorage(slot.uploadUrl, picture, picture.type, 'photo')
  const { data } = await CLIENT[kind].put(`${BASE[kind]}/photo`, { key: slot.key })
  return data
}

/**
 * Changes the password. Every other device is signed out by the server, and this one is handed a new session, which is
 * stored here at once -- otherwise the very next request would find this device's old, now-revoked session gone.
 */
export async function changePassword(kind: ProfileKind, input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void> {
  const { data } = await CLIENT[kind].post<TokenResponse>(`${BASE[kind]}/password`, input)
  if (kind === 'user') {
    store.dispatch(setCredentials({ accessToken: data.accessToken, refreshToken: data.refreshToken, email: store.getState().auth.user?.email ?? '' }))
  } else {
    store.dispatch(setVendorCredentials({ accessToken: data.accessToken, refreshToken: data.refreshToken, email: store.getState().vendorAuth.vendor?.email ?? '' }))
  }
}
