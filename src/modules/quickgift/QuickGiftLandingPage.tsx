import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QuickGiftRequest } from '@/api/quickGifts'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { useActiveGifts } from '@/hooks/useGifts'
import { useMyQuickGiftRequests, useRequestQuickGiftPhotoLink } from '@/hooks/useQuickGifts'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

function QuickGiftDetailDialog({
  request,
  onHide,
  onRequestPhotoLink,
  requesting,
}: {
  request: QuickGiftRequest | null
  onHide: () => void
  onRequestPhotoLink: (request: QuickGiftRequest) => void
  requesting: boolean
}) {
  return (
    <Dialog header={request?.giftName} visible={request !== null} onHide={onHide} style={{ width: '32rem' }}>
      {request && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{new Date(request.createdAt).toLocaleString()}</span>
            <StatusBadge status={request.status} label={humanize(request.status)} />
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Recipient</p>
              <p className="text-text">{request.recipientName}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Phone</p>
              <p className="text-text">{request.recipientPhone}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-text-muted">Delivery address</p>
              <p className="text-text">{request.deliveryAddress}</p>
            </div>
            {request.giftMessage && (
              <div className="sm:col-span-2">
                <p className="text-xs text-text-muted">Gift message</p>
                <p className="text-text">{request.giftMessage}</p>
              </div>
            )}
            {request.orderDisplayId && (
              <div>
                <p className="text-xs text-text-muted">Order</p>
                <p className="text-text">{request.orderDisplayId}</p>
              </div>
            )}
          </div>

          {request.rejectionReason && <p className="text-sm text-red-500 dark:text-red-400">Rejected: {request.rejectionReason}</p>}

          <div>
            <p className="mb-2 text-xs text-text-muted">Recipient's photo</p>
            {request.photoUrl ? (
              <a href={request.photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                <img src={request.photoUrl} alt={request.photoFileName ?? ''} className="h-32 w-32 rounded-lg border border-border object-cover" />
              </a>
            ) : (
              <div className="grid h-32 w-32 place-items-center rounded-lg border border-dashed border-border text-text-muted">
                <i className="pi pi-image text-2xl" />
              </div>
            )}
          </div>

          {request.status === 'APPROVED' && (
            <Button
              label={request.photoUrl ? "Photo not right? Send the link again" : 'Request a photo from the recipient'}
              icon="pi pi-send"
              outlined
              size="small"
              className="self-start"
              loading={requesting}
              onClick={() => onRequestPhotoLink(request)}
            />
          )}
        </div>
      )}
    </Dialog>
  )
}

export function QuickGiftLandingPage() {
  const navigate = useNavigate()
  const { data: gifts } = useActiveGifts()
  const { data: requests, isLoading } = useMyQuickGiftRequests()
  const requestPhotoLink = useRequestQuickGiftPhotoLink()

  const [viewing, setViewing] = useState<QuickGiftRequest | null>(null)
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  const recentlyUsed = useMemo(() => {
    const quickGiftEligible = (gifts ?? []).filter((g) => g.modules.includes('QUICK_GIFT'))
    const usedIds = new Set((requests ?? []).map((r) => r.giftId))
    const used = quickGiftEligible.filter((g) => usedIds.has(g.id))
    return (used.length > 0 ? used : quickGiftEligible).slice(0, 4)
  }, [gifts, requests])

  async function handleRequestPhotoLink(request: QuickGiftRequest) {
    try {
      const result = await requestPhotoLink.mutateAsync(request.id)
      setPhotoLinkPrompt({ link: result.recipientUploadUrl, phone: request.recipientPhone, recipientName: request.recipientName })
      showToast({ severity: 'success', summary: 'Link sent to the recipient' })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Quick Gift"
        subtitle="Request a personalized gift for one recipient — no campaign, no waiting."
        actions={<Button label="Browse Gift Store" icon="pi pi-shop" onClick={() => navigate('/gift-store')} />}
      />

      {recentlyUsed.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase">
            {(requests ?? []).length > 0 ? 'Recently used gifts' : 'Available gifts'}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentlyUsed.map((gift) => (
              <button
                key={gift.id}
                type="button"
                onClick={() => navigate(`/quick-gift/new/${gift.id}`)}
                className="group overflow-hidden rounded-xl border border-border bg-surface text-left transition-shadow hover:shadow-md"
              >
                <div className="aspect-[4/3] w-full bg-surface-muted">
                  {gift.images[0] ? (
                    <img src={gift.images[0].imageUrl} alt={gift.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-text-muted">
                      <i className="pi pi-gift text-2xl" />
                    </div>
                  )}
                </div>
                <p className="truncate p-3 text-sm font-medium text-text">{gift.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase">Recent requests</h2>
      {!isLoading && requests?.length === 0 ? (
        <EmptyState
          icon="pi-bolt"
          title="No Quick Gift requests yet"
          description="Pick a gift from the Gift Store to send your first one — it goes straight to your Company Admin for approval."
          action={<Button label="Browse Gift Store" icon="pi pi-shop" onClick={() => navigate('/gift-store')} />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {requests?.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => setViewing(request)}
              className="rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-accent/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-text">{request.giftName}</span>
                  <span className="ml-2 text-xs text-text-muted">for {request.recipientName}</span>
                </div>
                <StatusBadge status={request.status} label={humanize(request.status)} />
              </div>
              <p className="mt-1 text-xs text-text-muted">{new Date(request.createdAt).toLocaleString()}</p>
              {request.rejectionReason && <p className="mt-2 text-sm text-red-500 dark:text-red-400">Rejected: {request.rejectionReason}</p>}
            </button>
          ))}
        </div>
      )}

      <QuickGiftDetailDialog
        request={viewing}
        onHide={() => setViewing(null)}
        onRequestPhotoLink={handleRequestPhotoLink}
        requesting={requestPhotoLink.isPending}
      />
      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
