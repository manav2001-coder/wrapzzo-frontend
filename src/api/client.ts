const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function request<T>(path: string, method: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`)
  }

  if (response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function authGet<T>(path: string, token: string): Promise<T> {
  return request<T>(path, 'GET', token)
}

export function authPost<T>(path: string, token: string, body?: unknown): Promise<T> {
  return request<T>(path, 'POST', token, body)
}

export function authDelete<T>(path: string, token: string): Promise<T> {
  return request<T>(path, 'DELETE', token)
}
