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

export interface CurrentUser {
  permissions: string[]
  /** Null for platform staff -- a company user's own company, so self-service pages can resolve "my company" without an id in the URL. */
  companyId: string | null
  companyName: string | null
  /** Someone reports to this user, which makes them the approver of their team's doctor requests. */
  managesTeam: boolean
  /** The company's own names for its navigation menus (menu id -> name). Absent or empty: the defaults. */
  menuLabels?: Record<string, string>
  /** Sees the whole company (platform staff always do) -- the only people who may change anyone's placement. */
  companyWide?: boolean
  /** The caller's own name, for greeting them. */
  name?: string
  /** Their profile picture; null or absent when none has been set. */
  photoUrl?: string | null
}

/** The logged-in user's effective access-control keys and their own company -- lets the UI gate things like "New campaign" without guessing from a role name. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>('/api/auth/me')
  return data
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

/**
 * Asks for a reset link. Raw axios for the same reason as setupPassword: nobody is signed in. The answer is always the same
 * whether or not the email has an account, so the page can say nothing more than "if it does, we sent one".
 */
export async function forgotPassword(email: string): Promise<void> {
  await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/forgotPassword`, { email })
}

/** Sets a new password from the emailed link. It does not sign the person in: they sign in themselves afterwards. */
export async function resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
  await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/resetPassword`, { token, newPassword, confirmPassword })
}
