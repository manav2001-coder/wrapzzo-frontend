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
 *
 * A failed validation arrives as "Validation failed: name must not be blank; ..." -- the reasons are
 * in the message itself, so every screen that shows it says what to fix. `context` leads with what was
 * being done when it failed ("The company was created but its logo failed to upload.").
 */
export function useApiErrorToast() {
  const { t } = useTranslation()

  return React.useCallback(
    (error: unknown, context?: string) => {
      const lead = (reason: string) => toast.error(context ? `${context} ${reason}` : reason)
      if (error instanceof ApiError) {
        if (error.status === undefined) return lead(t('errors.network'))
        if (error.status >= 500) return lead(t('errors.generic'))
        return lead(error.message || t('errors.generic'))
      }
      return lead(t('errors.generic'))
    },
    [t],
  )
}
