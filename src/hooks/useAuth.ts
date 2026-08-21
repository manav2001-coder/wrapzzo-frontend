import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { logout as logoutRequest } from '@/api/auth'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { clearCredentials } from '@/features/auth/authSlice'

/** Clears local session state immediately; the server-side revoke is best-effort. */
export function useLogout() {
  const dispatch = useAppDispatch()
  const refreshToken = useAppSelector((state) => state.auth.refreshToken)
  const queryClient = useQueryClient()

  return useCallback(() => {
    if (refreshToken) {
      logoutRequest(refreshToken).catch(() => {
        // best-effort -- local state is cleared regardless
      })
    }
    dispatch(clearCredentials())
    queryClient.clear()
  }, [dispatch, refreshToken, queryClient])
}
