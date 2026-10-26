import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ApiError } from '@/lib/axiosClient'

/**
 * Turn an API failure into a toast the user can act on (MobixFL's `useApiErrorToast`).
 *
 * The backend's domain errors (`{ error: "..." }`) are written for the person using the screen --
 * "A gift with this name already exists" -- so they are shown as they are. A server FAULT is the
 * exception: its raw text ("Internal Server Error", a proxy's "Bad Gateway") helps nobody and reads
 * as a crash, so only the friendly translated line is shown. No response at all means the network.
 */
export function useApiErrorToast() {
  const { t } = useTranslation()

  return React.useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === undefined) {
          toast.error(t('errors.network'))
          return
        }
        if (error.status >= 500) {
          toast.error(t('errors.generic'))
          return
        }
        toast.error(error.message || t('errors.generic'))
        return
      }
      toast.error(t('errors.generic'))
    },
    [t],
  )
}
