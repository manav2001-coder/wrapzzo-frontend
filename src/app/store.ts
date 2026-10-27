import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'
import vendorAuthReducer from '@/features/vendorAuth/vendorAuthSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  vendorAuth: vendorAuthReducer,
})

export type RootState = ReturnType<typeof rootReducer>

/** A fresh store -- the app makes one; component tests make one per render with seeded sessions. */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState })
}

export const store = makeStore()

export type AppDispatch = typeof store.dispatch
