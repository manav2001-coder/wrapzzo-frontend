import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { vendorLogout as vendorLogoutRequest } from '@/api/vendorAuth'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { clearVendorCredentials } from '@/features/vendorAuth/vendorAuthSlice'

/** Clears local session state immediately; the server-side revoke is best-effort. */
export function useVendorLogout() {
  const dispatch = useAppDispatch()
  const refreshToken = useAppSelector((state) => state.vendorAuth.refreshToken)
  const queryClient = useQueryClient()

  return useCallback(() => {
    if (refreshToken) {
      vendorLogoutRequest(refreshToken).catch(() => {
        // best-effort -- local state is cleared regardless
      })
    }
    dispatch(clearVendorCredentials())
    queryClient.clear()
  }, [dispatch, refreshToken, queryClient])
}
