import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ApiError } from '@/lib/axiosClient'
import { UserFacingError } from '@/lib/user-facing-error'

/**
 * Turn an API failure into a toast the user can act on (MobixFL's `useApiErrorToast`).
 *
 * The backend's domain errors (`{ error: "..." }`) are written for the person using the screen --
 * "A gift with this name already exists" -- so they are shown as they are, and so is a server fault the
 * backend explained in that same field. A fault with no such explanation ("Internal Server Error", a proxy's
 * "Bad Gateway") says what it is: a server error, its number, and that it is not the user's doing. No response
 * at all means the network. An error thrown with a reason (UserFacingError) is shown as it is.
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
      if (error instanceof UserFacingError) return lead(error.message)
      if (error instanceof ApiError) {
        if (error.status === undefined) return lead(t('errors.network'))
        if (error.status >= 500) {
          const explained = (error.data as { error?: unknown } | undefined)?.error
          return lead(typeof explained === 'string' && explained ? explained : t('errors.server', { status: error.status }))
        }
        return lead(error.message || t('errors.generic'))
      }
      if (error instanceof TypeError) return lead(t('errors.network'))
      return lead(t('errors.generic'))
    },
    [t],
  )
}
