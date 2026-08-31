import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Gift } from '@/api/gifts'
import type { QuickGiftRequest } from '@/api/quickGifts'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { useActiveGifts } from '@/hooks/useGifts'
import { useMyQuickGiftRequests, useRequestQuickGiftPhotoLink } from '@/hooks/useQuickGifts'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

function GiftPickCard({ gift, onPick }: { gift: Gift; onPick: () => void }) {
  const image = gift.images[0]?.imageUrl

  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-surface-muted">
        {image ? (
          <img src={image} alt={gift.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-muted">
            <i className="pi pi-gift text-3xl" />
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-text shadow-sm">
          {gift.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium text-text">{gift.name}</p>
        {gift.description && <p className="line-clamp-2 text-xs text-text-muted">{gift.description}</p>}
        <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-accent">
          <i className="pi pi-bolt" /> Quick Gift this
        </span>
      </div>
    </button>
  )
}

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
  const { data: gifts, isLoading: giftsLoading } = useActiveGifts()
  const { data: requests, isLoading } = useMyQuickGiftRequests()
  const requestPhotoLink = useRequestQuickGiftPhotoLink()

  const [viewing, setViewing] = useState<QuickGiftRequest | null>(null)
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')

  const categories = useMemo(() => {
    const set = new Set((gifts ?? []).map((g) => g.category))
    return ['ALL', ...Array.from(set).sort()]
  }, [gifts])

  const filteredGifts = useMemo(() => {
    return (gifts ?? []).filter((g) => {
      if (category !== 'ALL' && g.category !== category) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q)
    })
  }, [gifts, search, category])

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
      <PageHeader title="Quick Gift" subtitle="Pick a gift below to request it for one recipient — no campaign, no waiting." />

      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase">Choose a gift</h2>
      {!giftsLoading && (gifts ?? []).length === 0 ? (
        <EmptyState icon="pi-gift" title="No gifts available yet" description="Your Wrapzzo account manager hasn't added any gifts to the catalogue yet." />
      ) : (
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gifts..." className="w-full sm:w-72" />
            <Dropdown
              value={category}
              onChange={(e) => setCategory(e.value)}
              options={categories.map((c) => ({ label: c === 'ALL' ? 'All categories' : c, value: c }))}
              className="w-full sm:w-56"
            />
          </div>

          {giftsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-xl bg-surface-muted" />
              ))}
            </div>
          ) : filteredGifts.length === 0 ? (
            <EmptyState icon="pi-search" title="No gifts match your search" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {filteredGifts.map((gift) => (
                <GiftPickCard key={gift.id} gift={gift} onPick={() => navigate(`/quick-gift/new/${gift.id}`)} />
              ))}
            </div>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase">Recent requests</h2>
      {!isLoading && requests?.length === 0 ? (
        <EmptyState icon="pi-bolt" title="No Quick Gift requests yet" description="Pick a gift above to send your first one — it goes straight to your Company Admin for approval." />
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
