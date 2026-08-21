import axios from 'axios'
import type { TokenResponse } from './auth'

/**
 * Deliberately a raw axios call, not apiClient -- this is a public endpoint
 * reached from an emailed link with no admin session involved, and
 * apiClient's interceptor would otherwise try to refresh/redirect using
 * whatever admin auth state happens to be in the browser, which has nothing
 * to do with this vendor.
 */
export async function setupVendorPassword(token: string, password: string, confirmPassword: string): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(`${import.meta.env.VITE_API_BASE_URL}/api/vendor/auth/setupPassword`, {
    token,
    password,
    confirmPassword,
  })
  return data
}
