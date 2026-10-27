import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AlertTriangle, CheckCircle2, CloudUpload, Gift, Loader2, Send } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { getRecipientUploadDetails, uploadRecipientPhoto, type RecipientUploadKind } from '@/api/recipientUpload'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** The backend's `{ error }` message when it sent one, else the caller's fallback. */
function serverMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback
  return (err.response?.data as { error?: string } | undefined)?.error ?? fallback
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <AuthShell>
      <Card>
        <CardContent className="p-6 sm:p-8">{children}</CardContent>
      </Card>
    </AuthShell>
  )
}

function Outcome({ tone, title, body }: { tone: 'error' | 'success'; title: string; body: string }) {
  const Icon = tone === 'error' ? AlertTriangle : CheckCircle2
  return (
    <Panel>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span
          className={cn(
            'grid h-14 w-14 place-items-center rounded-full',
            tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
          )}
        >
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      </div>
    </Panel>
  )
}

/**
 * Reached from an emailed or WhatsApp'd link by a recipient with no Wrappzo account: shows what
 * the gift is and takes one photo. `kind` picks a Campaign submission's link or a Quick Gift's.
 */
export function RecipientUploadPage({ kind = 'recipient' }: { kind?: RecipientUploadKind }) {
  const { t } = useTranslation('public')
  const { token } = useParams<{ token: string }>()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: details, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['recipient-upload', kind, token],
    queryFn: () => getRecipientUploadDetails(token!, kind),
    enabled: Boolean(token),
    retry: false,
  })

  // Each pick mints a blob URL; release the previous one so retries don't pin images in memory.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function handleFile(selected: File | undefined) {
    if (!selected) return
    setFile(selected)
    setError(null)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragOver(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  async function handleUpload() {
    if (!file || !token) return
    setUploading(true)
    setError(null)
    try {
      await uploadRecipientPhoto(token, file, kind)
      setUploaded(true)
    } catch (err) {
      setError(serverMessage(err, t('upload.failed')))
    } finally {
      setUploading(false)
    }
  }

  if (!token) {
    return <Outcome tone="error" title={t('upload.invalidTitle')} body={t('upload.missingToken')} />
  }

  if (isLoading) {
    return (
      <Panel>
        <div className="grid place-items-center py-10" role="status" aria-label={t('upload.loading')}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Panel>
    )
  }

  if (isError || !details) {
    return <Outcome tone="error" title={t('upload.invalidTitle')} body={serverMessage(queryError, t('upload.expired'))} />
  }

  if (uploaded || details.alreadyUploaded) {
    return (
      <Outcome
        tone="success"
        title={t('upload.thanksTitle')}
        body={t('upload.thanksBody', { company: details.companyName, gift: details.giftName ?? t('upload.yourGift') })}
      />
    )
  }

  return (
    <Panel>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Gift className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">
            {details.recipientName
              ? t('upload.titleNamed', { company: details.companyName, name: details.recipientName })
              : t('upload.title', { company: details.companyName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('upload.subtitle')}</p>
        </div>

        {details.giftName && (
          <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-background">
              {details.giftImageUrls[0] ? (
                <img src={details.giftImageUrls[0]} alt={details.giftName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">
                  <Gift className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium">{details.giftName}</p>
              {details.giftDescription && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{details.giftDescription}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <p id="photo-label" className="mb-2 text-sm font-medium">
            {t('upload.photoLabel')}
          </p>
          <button
            type="button"
            aria-labelledby="photo-label"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            {previewUrl ? (
              <img src={previewUrl} alt={t('upload.preview')} className="h-28 w-28 rounded-md object-cover" />
            ) : (
              <>
                <CloudUpload className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('upload.dropHint')}</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="photo-input"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {file && !error && (
            <Button variant="link" size="sm" className="mt-1 h-auto px-0" onClick={() => fileInputRef.current?.click()}>
              {t('upload.change')}
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button className="w-full" disabled={!file} loading={uploading} onClick={handleUpload}>
          <Send />
          {t('upload.send')}
        </Button>
      </div>
    </Panel>
  )
}
