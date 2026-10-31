import { FileText } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDialog } from '@/components/app-dialog'

const IMAGE_NAME = /\.(png|jpe?g|webp)$/i

export const isImageName = (name: string | null | undefined) => IMAGE_NAME.test(name ?? '')

/** A proof's small preview: the picture itself, or a file tile for a PDF. */
export function ArtworkThumb({ src, name, size = 56 }: { src: string; name: string | null; size?: number }) {
  return isImageName(name) ? (
    <img src={src} alt="" className="shrink-0 rounded-md border bg-muted object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground" style={{ width: size, height: size }}>
      <FileText className="h-5 w-5" />
    </span>
  )
}

/**
 * "Is this the right file?" before a proof goes to the customer: the picture it is about to send
 * (a file tile and name for a PDF), with upload or cancel. A wrong pick costs the customer a review.
 */
export function ArtworkUploadDialog({
  file,
  uploading,
  onConfirm,
  onCancel,
}: {
  file: File | null
  uploading: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation('vendor')
  const url = useMemo(() => (file && isImageName(file.name) ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  return (
    <AppDialog
      open={file !== null}
      onOpenChange={(open) => !open && !uploading && onCancel()}
      size="md"
      title={t('order.artwork.confirmTitle')}
      description={t('order.artwork.confirmBody')}
      confirmLabel={t('order.artwork.confirmLabel')}
      cancelLabel={t('order.artwork.confirmCancel')}
      loading={uploading}
      onConfirm={onConfirm}
    >
      {file && (
        <div className="space-y-2">
          {url ? (
            <img src={url} alt={t('order.artwork.previewAlt', { name: file.name })} className="mx-auto max-h-80 rounded-md border object-contain" />
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/40 py-10 text-sm text-muted-foreground">
              <FileText className="h-6 w-6" />
              {t('order.artwork.pdfPreview')}
            </div>
          )}
          <p className="truncate text-center text-xs text-muted-foreground">{file.name}</p>
        </div>
      )}
    </AppDialog>
  )
}
