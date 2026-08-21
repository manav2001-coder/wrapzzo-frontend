import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { store } from '@/app/store'
import { clearCredentials, setCredentials } from '@/features/auth/authSlice'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Single-flight refresh: if several requests 401 at once, only the first
// triggers a /refresh call and the rest wait on the same promise.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = store.getState().auth.refreshToken
  if (!refreshToken) throw new Error('No refresh token available')

  const response = await axios.post<{ accessToken: string; refreshToken: string; expiresInSeconds: number }>(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
    { refreshToken },
  )
  const email = store.getState().auth.user?.email ?? ''
  store.dispatch(setCredentials({ ...response.data, email }))
  return response.data.accessToken
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/')

    // Also retry on 403: the backend's JWT filter silently swallows an
    // expired/invalid token and clears the security context rather than
    // rejecting the request outright, and with no custom
    // AuthenticationEntryPoint configured, Spring Security's default for an
    // unauthenticated request to a protected endpoint is 403 -- identical to
    // a real "you lack this permission" response. Refreshing first tells
    // the two apart: if the retry still 403s, it's a genuine permission
    // error and surfaces normally.
    const isRetryableStatus = error.response?.status === 401 || error.response?.status === 403
    if (isRetryableStatus && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch {
        store.dispatch(clearCredentials())
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(normalizeError(error))
  },
)

export class ApiError extends Error {
  status?: number
  data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Domain errors come back as { error: message }; validation failures use Spring's default 400 body. */
function normalizeError(error: AxiosError): ApiError {
  const data = error.response?.data as { error?: string; message?: string } | undefined
  const message = data?.error ?? data?.message ?? error.message ?? 'Something went wrong. Please try again.'
  return new ApiError(message, error.response?.status, error.response?.data)
}
