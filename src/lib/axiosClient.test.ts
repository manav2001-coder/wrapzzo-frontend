import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axiosClient'
import { store } from '@/app/store'
import { clearCredentials, setCredentials } from '@/features/auth/authSlice'

function jwt(sub: string) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${b64({ alg: 'none' })}.${b64({ sub })}.sig`
}

const EXPIRED = jwt('expired')
const FRESH = jwt('fresh')

function reply(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse
  if (status >= 400) return Promise.reject(new AxiosError('failed', String(status), config, null, response))
  return Promise.resolve(response)
}

describe('apiClient token refresh', () => {
  const originalAdapter = apiClient.defaults.adapter
  const seen: string[] = []

  beforeEach(() => {
    seen.length = 0
    store.dispatch(setCredentials({ accessToken: EXPIRED, refreshToken: 'r1', email: 'am@x.com' }))
    const adapter: AxiosAdapter = (config) => {
      seen.push(`${config.url} ${config.headers.Authorization}`)
      const expired = config.headers.Authorization === `Bearer ${EXPIRED}`
      if (config.url === '/api/auth/login') return reply(config, 401, { error: 'Wrong email or password' })
      return expired ? reply(config, 403, {}) : reply(config, 200, { ok: true })
    }
    apiClient.defaults.adapter = adapter
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: FRESH, refreshToken: 'r2', expiresInSeconds: 900 } })
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    store.dispatch(clearCredentials())
    vi.restoreAllMocks()
  })

  it('refreshes and retries /api/auth/me when the saved access token has expired', async () => {
    const { data } = await apiClient.get('/api/auth/me')

    expect(data).toEqual({ ok: true })
    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(seen).toEqual([`/api/auth/me Bearer ${EXPIRED}`, `/api/auth/me Bearer ${FRESH}`])
    expect(store.getState().auth.refreshToken).toBe('r2')
  })

  it('does not try to refresh a failed login', async () => {
    await expect(apiClient.post('/api/auth/login', { email: 'a', password: 'b' })).rejects.toMatchObject({ message: 'Wrong email or password' })
    expect(axios.post).not.toHaveBeenCalled()
  })
})
