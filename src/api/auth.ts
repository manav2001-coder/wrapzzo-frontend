import axios from 'axios'
import { apiClient } from '@/lib/axiosClient'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

export interface LockedAccountInfo {
  lockedUntil: string
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/auth/login', { email, password })
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/api/auth/logout', { refreshToken })
}

/**
 * Deliberately a raw axios call, not apiClient -- reached from an emailed
 * link before any admin session exists, and doesn't need the auth-refresh
 * interceptor at all.
 */
export async function setupPassword(token: string, password: string, confirmPassword: string): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(`${import.meta.env.VITE_API_BASE_URL}/api/auth/setupPassword`, {
    token,
    password,
    confirmPassword,
  })
  return data
}
