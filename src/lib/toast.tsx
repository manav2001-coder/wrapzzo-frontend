import { Toast } from 'primereact/toast'
import { createRef } from 'react'

export const toastRef = createRef<Toast>()

export function showToast(options: { severity: 'success' | 'error' | 'info' | 'warn'; summary: string; detail?: string }) {
  toastRef.current?.show({ ...options, life: 4000 })
}

export function showApiError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const detail = error instanceof Error ? error.message : fallback
  showToast({ severity: 'error', summary: 'Error', detail })
}

export function GlobalToast() {
  return <Toast ref={toastRef} position="top-right" />
}
