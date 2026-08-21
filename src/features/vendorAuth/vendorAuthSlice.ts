import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface VendorAuthTokens {
  accessToken: string
  refreshToken: string
  email: string
  rememberMe?: boolean
}

export interface VendorAuthUser {
  email: string
  sub: string
}

interface VendorAuthState {
  accessToken: string | null
  refreshToken: string | null
  vendor: VendorAuthUser | null
  rememberMe: boolean
}

const STORAGE_KEY = 'wrapzzo.vendorAuth'

function readStorage(storage: Storage): VendorAuthState | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as VendorAuthState) : null
  } catch {
    return null
  }
}

function loadPersistedState(): VendorAuthState {
  return (
    readStorage(localStorage) ??
    readStorage(sessionStorage) ?? { accessToken: null, refreshToken: null, vendor: null, rememberMe: true }
  )
}

function persistState(state: VendorAuthState) {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (state.accessToken && state.refreshToken) {
    const target = state.rememberMe ? localStorage : sessionStorage
    target.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
}

const vendorAuthSlice = createSlice({
  name: 'vendorAuth',
  initialState: loadPersistedState(),
  reducers: {
    setVendorCredentials(state, action: PayloadAction<VendorAuthTokens>) {
      const claims = decodeJwtPayload(action.payload.accessToken)
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.vendor = { email: action.payload.email, sub: String(claims.sub ?? '') }
      if (action.payload.rememberMe !== undefined) {
        state.rememberMe = action.payload.rememberMe
      }
      persistState(state)
    },
    clearVendorCredentials(state) {
      state.accessToken = null
      state.refreshToken = null
      state.vendor = null
      persistState(state)
    },
  },
})

export const { setVendorCredentials, clearVendorCredentials } = vendorAuthSlice.actions
export default vendorAuthSlice.reducer
