import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputTextarea } from 'primereact/inputtextarea'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { SectionHeader } from '@/components/SectionHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useApproveQuickGiftRequest, usePendingQuickGiftApprovals, useRejectQuickGiftRequest } from '@/hooks/useQuickGifts'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

/** Campaign submissions never land here -- they're approved automatically the moment they're submitted. Only Quick Gift requests need a human decision. */
export function ApprovalQueuePage() {
  const { data: quickGifts, isLoading } = usePendingQuickGiftApprovals()
  const approveQuickGift = useApproveQuickGiftRequest()
  const rejectQuickGift = useRejectQuickGiftRequest()

  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  async function handleApproveQuickGift(id: string) {
    try {
      const result = await approveQuickGift.mutateAsync(id)
      showToast({ severity: 'success', summary: 'Approved', detail: 'An order has been created.' })
      if (result.recipientUploadUrl) {
        setPhotoLinkPrompt({ link: result.recipientUploadUrl, phone: result.recipientPhone, recipientName: result.recipientName })
      }
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !reason.trim()) return
    try {
      await rejectQuickGift.mutateAsync({ id: rejectTarget, reason: reason.trim() })
      showToast({ severity: 'success', summary: 'Rejected' })
      setRejectTarget(null)
      setReason('')
    } catch (error) {
      showApiError(error)
    }
  }

  const totalPending = quickGifts?.length ?? 0

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Quick Gift requests from your team, waiting on your decision." />

      {!isLoading && totalPending === 0 ? (
        <EmptyState icon="pi-check-square" title="Nothing pending" description="You're all caught up. New Quick Gift requests will appear here." />
      ) : (
        <div>
          <SectionHeader eyebrow={`${totalPending} pending`} title="Quick Gift requests" />
          <div className="flex flex-col gap-3">
            {quickGifts?.map((request) => (
              <div key={request.id} className="rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-500">
                      <i className="pi pi-bolt text-sm" />
                    </div>
                    <div>
                      <span className="font-semibold text-text">{request.giftName}</span>
                      <span className="ml-2 text-xs text-text-muted">requested by someone on your team</span>
                    </div>
                  </div>
                  <StatusBadge status={request.status} label={humanize(request.status)} />
                </div>
                <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-text-muted">Recipient: </span>
                    <span className="text-text">{request.recipientName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Phone: </span>
                    <span className="text-text">{request.recipientPhone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-text-muted">Deliver to: </span>
                    <span className="text-text">{request.deliveryAddress}</span>
                  </div>
                  {request.giftMessage && (
                    <div className="sm:col-span-2">
                      <span className="text-text-muted">Gift message: </span>
                      <span className="text-text">{request.giftMessage}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    label="Approve"
                    icon="pi pi-check"
                    size="small"
                    loading={approveQuickGift.isPending}
                    onClick={() => handleApproveQuickGift(request.id)}
                  />
                  <Button
                    label="Reject"
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    outlined
                    onClick={() => setRejectTarget(request.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog header="Reject Quick Gift request" visible={rejectTarget !== null} onHide={() => setRejectTarget(null)} style={{ width: '28rem' }}>
        <div className="flex flex-col gap-3">
          <label htmlFor="approvalRejectReason" className="text-sm font-medium text-text">
            Reason (shown to the requester)
          </label>
          <InputTextarea id="approvalRejectReason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" text onClick={() => setRejectTarget(null)} />
            <Button label="Reject" severity="danger" disabled={!reason.trim()} loading={rejectQuickGift.isPending} onClick={handleReject} />
          </div>
        </div>
      </Dialog>

      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
