import axios from 'axios'
import type { TokenResponse } from './auth'
import { vendorApiClient } from '@/lib/vendorApiClient'

export async function vendorLogin(email: string, password: string): Promise<TokenResponse> {
  const { data } = await vendorApiClient.post<TokenResponse>('/api/vendor/auth/login', { email, password })
  return data
}

export async function vendorLogout(refreshToken: string): Promise<void> {
  await vendorApiClient.post('/api/vendor/auth/logout', { refreshToken })
}

/**
 * Deliberately a raw axios call, not vendorApiClient -- this is reached from
 * an emailed link before any vendor session exists, and doesn't need the
 * client's auth-refresh interceptor at all.
 */
export async function setupVendorPassword(token: string, password: string, confirmPassword: string): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(`${import.meta.env.VITE_API_BASE_URL}/api/vendor/auth/setupPassword`, {
    token,
    password,
    confirmPassword,
  })
  return data
}
