import { toast } from 'sonner'

/**
 * MIGRATION SHIM -- delete once every page calls sonner's `toast` and `useApiErrorToast` directly
 * (the MobixFL idiom). Until then the not-yet-migrated pages keep their old calls and get the new
 * toasts.
 */
export function showToast(options: { severity: 'success' | 'error' | 'info' | 'warn'; summary: string; detail?: string }) {
  const show = { success: toast.success, error: toast.error, info: toast.info, warn: toast.warning }[options.severity]
  show(options.summary, { description: options.detail })
}

export function showApiError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  toast.error(error instanceof Error ? error.message : fallback)
}
