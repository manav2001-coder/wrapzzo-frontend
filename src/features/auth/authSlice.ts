import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  email: string
  /** Omit to keep the session's existing preference (e.g. on token refresh). */
  rememberMe?: boolean
}

export interface AuthUser {
  email: string
  sub: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  /** true = persisted in localStorage (survives browser restart), false = sessionStorage (cleared when the tab closes). */
  rememberMe: boolean
}

const STORAGE_KEY = 'wrapzzo.auth'

function readStorage(storage: Storage): AuthState | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthState) : null
  } catch {
    return null
  }
}

function loadPersistedState(): AuthState {
  return (
    readStorage(localStorage) ??
    readStorage(sessionStorage) ?? { accessToken: null, refreshToken: null, user: null, rememberMe: true }
  )
}

function persistState(state: AuthState) {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (state.accessToken && state.refreshToken) {
    const target = state.rememberMe ? localStorage : sessionStorage
    target.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

/** Decodes a JWT's payload without verifying it -- for display purposes only, never trust this client-side. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadPersistedState(),
  reducers: {
    setCredentials(state, action: PayloadAction<AuthTokens>) {
      const claims = decodeJwtPayload(action.payload.accessToken)
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      // The access token only carries `sub`/`type`/`roleId` -- no email claim --
      // so the caller supplies it (from the login form, or the prior session).
      state.user = { email: action.payload.email, sub: String(claims.sub ?? '') }
      if (action.payload.rememberMe !== undefined) {
        state.rememberMe = action.payload.rememberMe
      }
      persistState(state)
    },
    clearCredentials(state) {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      persistState(state)
    },
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export default authSlice.reducer
