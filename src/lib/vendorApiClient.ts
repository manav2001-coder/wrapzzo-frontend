import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { store } from '@/app/store'
import { clearVendorCredentials, setVendorCredentials } from '@/features/vendorAuth/vendorAuthSlice'
import { ApiError } from '@/lib/axiosClient'

/**
 * Mirrors apiClient exactly, but reads/writes vendorAuth instead of auth and
 * redirects to /vendor/login on failure -- a vendor session must never share
 * token state, refresh logic, or a redirect target with an admin session.
 */
export const vendorApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

vendorApiClient.interceptors.request.use((config) => {
  const token = store.getState().vendorAuth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshVendorAccessToken(): Promise<string> {
  const refreshToken = store.getState().vendorAuth.refreshToken
  if (!refreshToken) throw new Error('No refresh token available')

  const response = await axios.post<{ accessToken: string; refreshToken: string; expiresInSeconds: number }>(
    `${import.meta.env.VITE_API_BASE_URL}/api/vendor/auth/refresh`,
    { refreshToken },
  )
  const email = store.getState().vendorAuth.vendor?.email ?? ''
  store.dispatch(setVendorCredentials({ ...response.data, email }))
  return response.data.accessToken
}

vendorApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthEndpoint = originalRequest?.url?.includes('/api/vendor/auth/')

    const isRetryableStatus = error.response?.status === 401 || error.response?.status === 403
    if (isRetryableStatus && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        refreshPromise ??= refreshVendorAccessToken().finally(() => {
          refreshPromise = null
        })
        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return vendorApiClient(originalRequest)
      } catch {
        store.dispatch(clearVendorCredentials())
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    const data = error.response?.data as { error?: string; message?: string } | undefined
    const message = data?.error ?? data?.message ?? error.message ?? 'Something went wrong. Please try again.'
    return Promise.reject(new ApiError(message, error.response?.status, error.response?.data))
  },
)
