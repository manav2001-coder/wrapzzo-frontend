import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputTextarea } from 'primereact/inputtextarea'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { useApproveSubmission, usePendingApproval, useRejectSubmission } from '@/hooks/useSubmissions'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

export function ApprovalQueuePage() {
  const { data: submissions, isLoading } = usePendingApproval()
  const approve = useApproveSubmission()
  const reject = useRejectSubmission()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  async function handleApprove(id: string) {
    try {
      const result = await approve.mutateAsync(id)
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

  async function handleReject() {
    if (!rejectingId || !reason.trim()) return
    try {
      await reject.mutateAsync({ id: rejectingId, reason: reason.trim() })
      showToast({ severity: 'success', summary: 'Rejected' })
      setRejectingId(null)
      setReason('')
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Recipient submissions from your team, waiting on your decision." />

      {!isLoading && submissions?.length === 0 ? (
        <EmptyState icon="pi-check-square" title="Nothing pending" description="You're all caught up. New submissions from your team will appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {submissions?.map((submission) => (
            <div key={submission.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link to={`/campaigns/${submission.campaignId}`} className="font-medium text-text hover:text-accent">
                    {submission.campaignName}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">by {submission.submittedByName}</span>
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
                <Button label="Approve" icon="pi pi-check" size="small" loading={approve.isPending} onClick={() => handleApprove(submission.id)} />
                <Button label="Reject" icon="pi pi-times" size="small" severity="danger" outlined onClick={() => setRejectingId(submission.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog header="Reject submission" visible={rejectingId !== null} onHide={() => setRejectingId(null)} style={{ width: '28rem' }}>
        <div className="flex flex-col gap-3">
          <label htmlFor="approvalRejectReason" className="text-sm font-medium text-text">
            Reason (shown to the submitter)
          </label>
          <InputTextarea id="approvalRejectReason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" text onClick={() => setRejectingId(null)} />
            <Button label="Reject" severity="danger" disabled={!reason.trim()} loading={reject.isPending} onClick={handleReject} />
          </div>
        </div>
      </Dialog>

      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
