const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`)
  }

  if (response.status === 200 && response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return postJson<TokenResponse>('/api/auth/login', { email, password })
}

export function refresh(refreshToken: string): Promise<TokenResponse> {
  return postJson<TokenResponse>('/api/auth/refresh', { refreshToken })
}

export function logout(refreshToken: string): Promise<void> {
  return postJson<void>('/api/auth/logout', { refreshToken })
}

/** Decodes a JWT's payload without verifying it -- for display purposes only, never trust this client-side. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
}
