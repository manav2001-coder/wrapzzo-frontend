import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { SectionHeader } from '@/components/SectionHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useApproveDoctorChangeRequest, usePendingDoctorChangeRequests, useRejectDoctorChangeRequest } from '@/hooks/useDoctorRequests'
import { useApproveQuickGiftRequest, usePendingQuickGiftApprovals, useRejectQuickGiftRequest } from '@/hooks/useQuickGifts'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

/** A manager's queue for their direct reports' doctor add/edit/remove requests (PRD: routed to "the MR's senior/manager"). */
function DoctorRequestsSection() {
  const { data: requests, isLoading } = usePendingDoctorChangeRequests()
  const approve = useApproveDoctorChangeRequest()
  const reject = useRejectDoctorChangeRequest()
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  async function handleApprove(id: string) {
    try {
      await approve.mutateAsync(id)
      showToast({ severity: 'success', summary: 'Approved' })
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !reason.trim()) return
    try {
      await reject.mutateAsync({ id: rejectTarget, reason: reason.trim() })
      showToast({ severity: 'success', summary: 'Rejected' })
      setRejectTarget(null)
      setReason('')
    } catch (error) {
      showApiError(error)
    }
  }

  if (!isLoading && (requests ?? []).length === 0) return null

  return (
    <div className="mb-8">
      <SectionHeader eyebrow={`${requests?.length ?? 0} pending`} title="Doctor change requests" />
      <div className="flex flex-col gap-3">
        {requests?.map((request) => (
          <div key={request.id} className="rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
                  <i className="pi pi-user-edit text-sm" />
                </div>
                <div>
                  <span className="font-semibold text-text">{humanize(request.action)}</span>
                  <span className="ml-2 text-xs text-text-muted">requested by {request.requestedByName}</span>
                </div>
              </div>
              <StatusBadge status={request.status} label={humanize(request.status)} />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              <div>
                <span className="text-text-muted">Doctor: </span>
                <span className="text-text">{request.proposedName ?? request.recipientName}</span>
              </div>
              {request.proposedPhone && (
                <div>
                  <span className="text-text-muted">Phone: </span>
                  <span className="text-text">{request.proposedPhone}</span>
                </div>
              )}
              {request.proposedAddress && (
                <div className="sm:col-span-2">
                  <span className="text-text-muted">Address: </span>
                  <span className="text-text">{request.proposedAddress}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button label="Approve" icon="pi pi-check" size="small" loading={approve.isPending} onClick={() => handleApprove(request.id)} />
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

      <Dialog
        header="Reject doctor change request"
        visible={rejectTarget !== null}
        onHide={() => setRejectTarget(null)}
        style={{ width: '28rem' }}
        breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      >
        <div className="flex flex-col gap-3">
          <label htmlFor="doctorRejectReason" className="text-sm font-medium text-text">
            Reason (shown to the requester)
          </label>
          <InputTextarea id="doctorRejectReason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" text onClick={() => setRejectTarget(null)} />
            <Button label="Reject" severity="danger" disabled={!reason.trim()} loading={reject.isPending} onClick={handleReject} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

/** Campaign submissions never land here -- they're approved automatically the moment they're submitted. Only Quick Gift requests need a human decision. */
export function ApprovalQueuePage() {
  const { data: quickGifts, isLoading } = usePendingQuickGiftApprovals()
  const { data: doctorRequests, isLoading: isLoadingDoctorRequests } = usePendingDoctorChangeRequests()
  const approveQuickGift = useApproveQuickGiftRequest()
  const rejectQuickGift = useRejectQuickGiftRequest()

  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)
  const [search, setSearch] = useState('')

  const filteredQuickGifts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return quickGifts ?? []
    return (quickGifts ?? []).filter(
      (r) =>
        r.giftName.toLowerCase().includes(q) ||
        r.recipientName.toLowerCase().includes(q) ||
        (r.requestedByName ?? '').toLowerCase().includes(q),
    )
  }, [quickGifts, search])

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

  const quickGiftCount = quickGifts?.length ?? 0
  const doctorRequestCount = doctorRequests?.length ?? 0
  const totalPending = quickGiftCount + doctorRequestCount
  const stillLoading = isLoading || isLoadingDoctorRequests

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Quick Gift requests and doctor changes from your team, waiting on your decision." />

      {!stillLoading && totalPending === 0 ? (
        <EmptyState icon="pi-check-square" title="Nothing pending" description="You're all caught up. New requests will appear here." />
      ) : (
        <div>
          <DoctorRequestsSection />

          {quickGiftCount === 0 ? null : (
          <>
          <SectionHeader eyebrow={`${quickGiftCount} pending`} title="Quick Gift requests" />
          <div className="mb-4">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by gift, recipient, or requester"
                className="w-full sm:w-80"
              />
            </IconField>
          </div>
          {filteredQuickGifts.length === 0 ? (
            <EmptyState icon="pi-search" title="No requests match" />
          ) : (
          <div className="flex flex-col gap-3">
            {filteredQuickGifts.map((request) => (
              <div key={request.id} className="rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-500">
                      <i className="pi pi-bolt text-sm" />
                    </div>
                    <div>
                      <span className="font-semibold text-text">{request.giftName}</span>
                      <span className="ml-2 text-xs text-text-muted">requested by {request.requestedByName ?? 'a team member'}</span>
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
          )}
          </>
          )}
        </div>
      )}

      <Dialog
        header="Reject Quick Gift request"
        visible={rejectTarget !== null}
        onHide={() => setRejectTarget(null)}
        style={{ width: '28rem' }}
        breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      >
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
