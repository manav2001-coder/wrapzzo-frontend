import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'
import uiReducer from '@/features/ui/uiSlice'
import vendorAuthReducer from '@/features/vendorAuth/vendorAuthSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    vendorAuth: vendorAuthReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
