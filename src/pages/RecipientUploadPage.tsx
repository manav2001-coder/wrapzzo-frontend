import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Button } from 'primereact/button'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useParams } from 'react-router-dom'
import { getRecipientUploadDetails, uploadRecipientPhoto } from '@/api/recipientUpload'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto flex max-w-lg flex-col items-center">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">W</div>
          <span className="text-lg font-semibold tracking-tight text-text">Wrappzo</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_36px_-12px_rgba(79,70,229,0.18)] sm:p-8">
      {children}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <Shell>
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-red-500/10 text-red-500 dark:text-red-400">
            <i className="pi pi-exclamation-triangle text-2xl" />
          </div>
          <h1 className="text-lg font-semibold text-text">This link isn't valid anymore</h1>
          <p className="max-w-sm text-sm text-text-muted">{message}</p>
        </div>
      </Card>
    </Shell>
  )
}

function SuccessState({ companyName, giftName }: { companyName: string; giftName: string | null }) {
  return (
    <Shell>
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            <i className="pi pi-check text-2xl" />
          </div>
          <h1 className="text-lg font-semibold text-text">Thank you!</h1>
          <p className="max-w-sm text-sm text-text-muted">
            Your photo is in. {companyName} will use it to get{giftName ? ` your ${giftName}` : ' your gift'} ready for you.
          </p>
        </div>
      </Card>
    </Shell>
  )
}

export function RecipientUploadPage() {
  const { token } = useParams<{ token: string }>()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: details, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['recipient-upload', token],
    queryFn: () => getRecipientUploadDetails(token!),
    enabled: Boolean(token),
    retry: false,
  })

  function handleFile(selected: File | undefined) {
    if (!selected) return
    setFile(selected)
    setError(null)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0])
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  async function handleUpload() {
    if (!file || !token) return
    setUploading(true)
    setError(null)
    try {
      await uploadRecipientPhoto(token, file)
      setUploaded(true)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? 'Something went wrong. Please try again.')
        : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  if (!token) {
    return <ErrorState message="This link is missing its upload token." />
  }

  if (isLoading) {
    return (
      <Shell>
        <Card>
          <div className="grid place-items-center py-10">
            <ProgressSpinner style={{ width: 36, height: 36 }} strokeWidth="4" />
          </div>
        </Card>
      </Shell>
    )
  }

  if (isError || !details) {
    const message = axios.isAxiosError(queryError)
      ? ((queryError.response?.data as { error?: string } | undefined)?.error ?? 'It may have expired or already been used.')
      : 'It may have expired or already been used.'
    return <ErrorState message={message} />
  }

  if (uploaded || details.alreadyUploaded) {
    return <SuccessState companyName={details.companyName} giftName={details.giftName} />
  }

  return (
    <Shell>
      <Card>
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <span className="inline-block text-3xl">🎁</span>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
              {details.companyName} has a gift for you{details.recipientName ? `, ${details.recipientName}` : ''}!
            </h1>
            <p className="mt-1 text-sm text-text-muted">We just need a quick photo from you to get it ready.</p>
          </div>

          {details.giftName && (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-muted p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                {details.giftImageUrls[0] ? (
                  <img src={details.giftImageUrls[0]} alt={details.giftName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-text-muted">
                    <i className="pi pi-gift text-xl" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-text">{details.giftName}</p>
                {details.giftDescription && <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{details.giftDescription}</p>}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-text">Please share a photo of yourself</p>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-surface-muted',
              ].join(' ')}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-28 w-28 rounded-lg object-cover" />
              ) : (
                <>
                  <i className="pi pi-cloud-upload text-2xl text-text-muted" />
                  <p className="text-sm text-text-muted">Tap to choose a photo, or drag one in</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
            </div>
            {file && !error && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs text-accent underline">
                Choose a different photo
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <Button
            label="Send my photo"
            icon="pi pi-send"
            disabled={!file}
            loading={uploading}
            onClick={handleUpload}
            className="w-full justify-center rounded-[10px]"
          />
        </div>
      </Card>
    </Shell>
  )
}
