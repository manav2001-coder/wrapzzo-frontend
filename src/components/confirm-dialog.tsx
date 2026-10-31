import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDialog } from '@/components/app-dialog'

/**
 * The "are you sure" every delete, remove and cancel goes through. Closes itself once `onConfirm`
 * settles; the caller reports failure (a toast), so the dialog never has to.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  onConfirm: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      onOpenChange(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={t('action.cancel')}
      confirmVariant="destructive"
      loading={busy}
      onConfirm={confirm}
    />
  )
}
