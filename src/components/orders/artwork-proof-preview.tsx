import { ExternalLink, Eye, FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppDialog } from '@/components/app-dialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const IMAGE_FILE = /\.(png|jpe?g|webp|gif|svg)$/i

/** A proof is an image or a document (a PDF); a stored file's name and its signed URL both say which. */
export function isImageProof(fileUrl: string, fileName?: string | null): boolean {
  return IMAGE_FILE.test(fileName ?? '') || IMAGE_FILE.test(fileUrl.split('?')[0])
}

/**
 * The vendor's proof, viewable where the reviewer already is: a thumbnail and a "View proof"
 * button that open it large in a dialog, so approving never means chasing a link into a new tab.
 * A PDF opens in the dialog's viewer; opening it in a tab stays available as a secondary action.
 */
export function ArtworkProofPreview({
  fileUrl,
  fileName,
  title,
  compact = false,
}: {
  fileUrl: string
  fileName?: string | null
  /** Dialog heading, e.g. "Version 2 · Order 71". */
  title: string
  /** Button only, no thumbnail -- for a list of earlier versions. */
  compact?: boolean
}) {
  const { t } = useTranslation('orders')
  const [open, setOpen] = useState(false)
  const image = isImageProof(fileUrl, fileName)

  return (
    <>
      {compact ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Eye />
          {t('artwork.viewProof')}
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('artwork.viewProof')}
            className={cn(
              'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-90',
              image ? 'h-20 w-28' : 'h-48 w-36',
            )}
          >
            {image ? (
              <img src={fileUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                {/* The icon stays underneath: it is what shows while the page loads, or if the browser cannot draw a PDF here. */}
                <FileText className="h-8 w-8 text-muted-foreground" />
                {/* The proof's first page, drawn in the box itself; clicks fall through to the button, which opens it large. */}
                <iframe
                  src={`${fileUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  title=""
                  aria-hidden
                  tabIndex={-1}
                  loading="lazy"
                  className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-white"
                />
              </>
            )}
          </button>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Eye />
            {t('artwork.viewProof')}
          </Button>
        </div>
      )}

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        size="xl"
        title={title}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                {t('artwork.openNewTab')}
              </a>
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('action.close', { ns: 'common' })}
            </Button>
          </div>
        }
      >
        {image ? (
          <img src={fileUrl} alt={title} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain" />
        ) : (
          <iframe src={fileUrl} title={title} className="h-[70vh] w-full rounded-md border" />
        )}
      </AppDialog>
    </>
  )
}
