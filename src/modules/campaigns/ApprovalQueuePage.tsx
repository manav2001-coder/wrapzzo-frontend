import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputTextarea } from 'primereact/inputtextarea'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { SectionHeader } from '@/components/SectionHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useApproveSubmission, usePendingApproval, useRejectSubmission } from '@/hooks/useSubmissions'
import { useApproveQuickGiftRequest, usePendingQuickGiftApprovals, useRejectQuickGiftRequest } from '@/hooks/useQuickGifts'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

type RejectTarget = { kind: 'submission' | 'quickGift'; id: string }

export function ApprovalQueuePage() {
  const { data: submissions, isLoading: submissionsLoading } = usePendingApproval()
  const approveSubmission = useApproveSubmission()
  const rejectSubmission = useRejectSubmission()

  const { data: quickGifts, isLoading: quickGiftsLoading } = usePendingQuickGiftApprovals()
  const approveQuickGift = useApproveQuickGiftRequest()
  const rejectQuickGift = useRejectQuickGiftRequest()

  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null)
  const [reason, setReason] = useState('')
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  async function handleApproveSubmission(id: string) {
    try {
      const result = await approveSubmission.mutateAsync(id)
      showToast({ severity: 'success', summary: 'Approved', detail: 'An order has been created.' })
      if (result.recipientUploadUrl) {
        const phone = result.values.find((v) => v.fieldKey === 'recipientPhone')?.value
        const name = result.values.find((v) => v.fieldKey === 'recipientName')?.value
        setPhotoLinkPrompt({
          link: result.recipientUploadUrl,
          phone: typeof phone === 'string' ? phone : null,
          recipientName: typeof name === 'string' ? name : null,
        })
      }
    } catch (error) {
      showApiError(error)
    }
  }

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
      if (rejectTarget.kind === 'submission') {
        await rejectSubmission.mutateAsync({ id: rejectTarget.id, reason: reason.trim() })
      } else {
        await rejectQuickGift.mutateAsync({ id: rejectTarget.id, reason: reason.trim() })
      }
      showToast({ severity: 'success', summary: 'Rejected' })
      setRejectTarget(null)
      setReason('')
    } catch (error) {
      showApiError(error)
    }
  }

  const isLoading = submissionsLoading || quickGiftsLoading
  const totalPending = (submissions?.length ?? 0) + (quickGifts?.length ?? 0)

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Campaign recipients and Quick Gift requests from your team, waiting on your decision." />

      {!isLoading && totalPending === 0 ? (
        <EmptyState icon="pi-check-square" title="Nothing pending" description="You're all caught up. New submissions and Quick Gift requests will appear here." />
      ) : (
        <div className="flex flex-col gap-6">
          {quickGifts && quickGifts.length > 0 && (
            <div>
              <SectionHeader eyebrow={`${quickGifts.length} pending`} title="Quick Gift requests" />
              <div className="flex flex-col gap-3">
                {quickGifts.map((request) => (
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
                        onClick={() => setRejectTarget({ kind: 'quickGift', id: request.id })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submissions && submissions.length > 0 && (
            <div>
              <SectionHeader eyebrow={`${submissions.length} pending`} title="Campaign submissions" />
              <div className="flex flex-col gap-3">
                {submissions.map((submission) => (
                  <div key={submission.id} className="rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
                          <i className="pi pi-megaphone text-sm" />
                        </div>
                        <div>
                          <Link to={`/campaigns/${submission.campaignId}`} className="font-semibold text-text hover:text-accent">
                            {submission.campaignName}
                          </Link>
                          <span className="ml-2 text-xs text-text-muted">by {submission.submittedByName}</span>
                        </div>
                      </div>
                      <StatusBadge status={submission.status} label={humanize(submission.status)} />
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                      {submission.giftName && (
                        <div>
                          <span className="text-text-muted">Gift: </span>
                          <span className="font-medium text-text">{submission.giftName}</span>
                        </div>
                      )}
                      {submission.values.map((v) => (
                        <div key={v.fieldKey}>
                          <span className="text-text-muted">{v.label}: </span>
                          <span className="text-text">{Array.isArray(v.value) ? v.value.join(', ') : String(v.value ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        label="Approve"
                        icon="pi pi-check"
                        size="small"
                        loading={approveSubmission.isPending}
                        onClick={() => handleApproveSubmission(submission.id)}
                      />
                      <Button
                        label="Reject"
                        icon="pi pi-times"
                        size="small"
                        severity="danger"
                        outlined
                        onClick={() => setRejectTarget({ kind: 'submission', id: submission.id })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        header={rejectTarget?.kind === 'quickGift' ? 'Reject Quick Gift request' : 'Reject submission'}
        visible={rejectTarget !== null}
        onHide={() => setRejectTarget(null)}
        style={{ width: '28rem' }}
      >
        <div className="flex flex-col gap-3">
          <label htmlFor="approvalRejectReason" className="text-sm font-medium text-text">
            Reason (shown to the requester)
          </label>
          <InputTextarea id="approvalRejectReason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" text onClick={() => setRejectTarget(null)} />
            <Button
              label="Reject"
              severity="danger"
              disabled={!reason.trim()}
              loading={rejectSubmission.isPending || rejectQuickGift.isPending}
              onClick={handleReject}
            />
          </div>
        </div>
      </Dialog>

      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
