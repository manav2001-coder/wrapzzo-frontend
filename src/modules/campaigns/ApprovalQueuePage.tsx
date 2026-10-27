import { Check, CheckSquare, ExternalLink, Palette, Search, UserCog, X, Zap } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { AppTabs } from '@/components/app-tabs'
import { EmptyState } from '@/components/empty-state'
import { LabelledField } from '@/components/fields/labelled-field'
import { MasterPageHeader } from '@/components/masters/master-page'
import { PhotoLinkDialog, type PhotoLinkPrompt } from '@/components/orders/photo-link-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useApproveDoctorChangeRequest, usePendingDoctorChangeRequests, useRejectDoctorChangeRequest } from '@/hooks/useDoctorRequests'
import { useHasAccess } from '@/hooks/use-permission'
import { usePendingArtworkApprovals, useReviewArtwork } from '@/hooks/useOrderDesigns'
import { useApproveQuickGiftRequest, usePendingQuickGiftApprovals, useRejectQuickGiftRequest } from '@/hooks/useQuickGifts'
import { formatDateTime } from '@/lib/datetime'
import { humanize } from '@/lib/format'

function Detail({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
      <span className="text-muted-foreground">{label}: </span>
      <span>{children}</span>
    </div>
  )
}

/** One pending item: what it is, who asked, its details, and Approve / Reject. */
function RequestCard({
  icon,
  title,
  subtitle,
  children,
  approving,
  onApprove,
  onReject,
  rejectLabel = 'Reject',
}: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
  approving: boolean
  onApprove: () => void
  onReject: () => void
  rejectLabel?: string
}) {
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <header className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">{children}</div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={approving} onClick={onApprove}>
          <Check />
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onReject}>
          <X />
          {rejectLabel}
        </Button>
      </div>
    </article>
  )
}

type Rejecting = { kind: 'quickGift' | 'doctor'; id: string } | { kind: 'artwork'; id: string; orderId: string } | null

/** Quick Gift requests and doctor changes from the team, waiting on the user's decision. Campaign submissions never land here. */
export function ApprovalQueuePage() {
  const showError = useApiErrorToast()
  // A manager reviewing only their team's doctor requests has no Quick Gift approval right: skip
  // that queue (it would only answer 403) and open on the doctor changes.
  const canApproveQuickGifts = useHasAccess(['campaign.approve', 'campaign.manage'])
  const { data: quickGifts, isLoading } = usePendingQuickGiftApprovals(canApproveQuickGifts)
  const { data: doctorRequests, isLoading: doctorsLoading } = usePendingDoctorChangeRequests()
  const approveQuickGift = useApproveQuickGiftRequest()
  const rejectQuickGift = useRejectQuickGiftRequest()
  const approveDoctor = useApproveDoctorChangeRequest()
  const rejectDoctor = useRejectDoctorChangeRequest()
  // MR-approved artwork waiting on this user's final approval (empty unless they're the MR's manager).
  const { data: artwork, isLoading: artworkLoading } = usePendingArtworkApprovals()
  const reviewArtwork = useReviewArtwork()

  const [tab, setTab] = useState(canApproveQuickGifts ? 'quickGift' : 'doctors')
  const [search, setSearch] = useState('')
  const [rejecting, setRejecting] = useState<Rejecting>(null)
  const [reason, setReason] = useState('')
  const [photoPrompt, setPhotoPrompt] = useState<PhotoLinkPrompt | null>(null)

  const q = search.trim().toLowerCase()
  const filteredQuickGifts = useMemo(
    () =>
      (quickGifts ?? []).filter(
        (r) => !q || [r.giftName, r.recipientName, r.requestedByName ?? ''].some((value) => value.toLowerCase().includes(q)),
      ),
    [quickGifts, q],
  )
  const total = (quickGifts?.length ?? 0) + (doctorRequests?.length ?? 0) + (artwork?.length ?? 0)

  async function approveGift(id: string) {
    try {
      const result = await approveQuickGift.mutateAsync(id)
      toast.success('Approved', { description: 'An order has been created.' })
      if (result.recipientUploadUrl) {
        setPhotoPrompt({ link: result.recipientUploadUrl, phone: result.recipientPhone, recipientName: result.recipientName })
      }
    } catch (err) {
      showError(err)
    }
  }

  async function approveDoctorChange(id: string) {
    try {
      await approveDoctor.mutateAsync(id)
      toast.success('Approved')
    } catch (err) {
      showError(err)
    }
  }

  async function approveArtwork(orderId: string, designId: string) {
    try {
      await reviewArtwork.mutateAsync({ orderId, designId })
      toast.success('Artwork approved', { description: 'The vendor can now print and dispatch.' })
    } catch (err) {
      showError(err)
    }
  }

  async function confirmReject() {
    if (!rejecting || !reason.trim()) return
    try {
      if (rejecting.kind === 'quickGift') await rejectQuickGift.mutateAsync({ id: rejecting.id, reason: reason.trim() })
      else if (rejecting.kind === 'artwork') await reviewArtwork.mutateAsync({ orderId: rejecting.orderId, designId: rejecting.id, comment: reason.trim() })
      else await rejectDoctor.mutateAsync({ id: rejecting.id, reason: reason.trim() })
      toast.success(rejecting.kind === 'artwork' ? 'Sent back to the vendor' : 'Rejected')
      setRejecting(null)
      setReason('')
    } catch (err) {
      showError(err)
    }
  }

  const quickGiftPanel = (
    <div className="space-y-3">
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by gift, recipient or requester" aria-label="Search requests" className="pl-8" />
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : filteredQuickGifts.length === 0 ? (
        <EmptyState variant="plain" icon={Zap} title={q ? 'No requests match' : 'No Quick Gift requests waiting'} />
      ) : (
        filteredQuickGifts.map((request) => (
          <RequestCard
            key={request.id}
            icon={<Zap className="h-4 w-4" />}
            title={request.giftName}
            subtitle={`Requested by ${request.requestedByName ?? 'a team member'} · ${formatDateTime(request.createdAt)}`}
            approving={approveQuickGift.isPending}
            onApprove={() => void approveGift(request.id)}
            onReject={() => setRejecting({ kind: 'quickGift', id: request.id })}
          >
            <Detail label="Recipient">{request.recipientName}</Detail>
            <Detail label="Phone">{request.recipientPhone}</Detail>
            <Detail label="Quantity">{request.quantity}</Detail>
            {request.vendorName && <Detail label="Vendor">{request.vendorName}</Detail>}
            <Detail label="Deliver to" wide>
              {request.deliveryAddress}
            </Detail>
            {request.giftMessage && (
              <Detail label="Gift message" wide>
                {request.giftMessage}
              </Detail>
            )}
          </RequestCard>
        ))
      )}
    </div>
  )

  const doctorPanel = doctorsLoading ? (
    <Skeleton className="h-40 w-full" />
  ) : (doctorRequests ?? []).length === 0 ? (
    <EmptyState variant="plain" icon={UserCog} title="No doctor changes waiting" />
  ) : (
    <div className="space-y-3">
      {(doctorRequests ?? []).map((request) => (
        <RequestCard
          key={request.id}
          icon={<UserCog className="h-4 w-4" />}
          title={`${humanize(request.action)} doctor`}
          subtitle={`Requested by ${request.requestedByName} · ${formatDateTime(request.createdAt)}`}
          approving={approveDoctor.isPending}
          onApprove={() => void approveDoctorChange(request.id)}
          onReject={() => setRejecting({ kind: 'doctor', id: request.id })}
        >
          <Detail label="Doctor">{request.proposedName ?? request.recipientName}</Detail>
          {request.proposedPhone && <Detail label="Phone">{request.proposedPhone}</Detail>}
          {request.proposedEmail && <Detail label="Email">{request.proposedEmail}</Detail>}
          {request.proposedAddress && (
            <Detail label="Address" wide>
              {request.proposedAddress}
            </Detail>
          )}
          {request.proposedDoctor?.registrationNumber && <Detail label="Registration no.">{request.proposedDoctor.registrationNumber}</Detail>}
          {request.proposedDoctor?.qualification && <Detail label="Qualification">{request.proposedDoctor.qualification}</Detail>}
          {request.proposedDoctor?.speciality && <Detail label="Speciality">{request.proposedDoctor.speciality}</Detail>}
          {request.proposedDoctor?.clinicName && <Detail label="Clinic / hospital">{request.proposedDoctor.clinicName}</Detail>}
        </RequestCard>
      ))}
    </div>
  )

  const artworkPanel = artworkLoading ? (
    <Skeleton className="h-40 w-full" />
  ) : (artwork ?? []).length === 0 ? (
    <EmptyState variant="plain" icon={Palette} title="No artwork waiting for your final approval" />
  ) : (
    <div className="space-y-3">
      {(artwork ?? []).map((item) => (
        <RequestCard
          key={item.designId}
          icon={<Palette className="h-4 w-4" />}
          title={`${item.giftName ?? 'Artwork'} · ${item.orderDisplayId}`}
          subtitle={`Approved by ${item.mrApprovedByName ?? 'the MR'}${item.mrApprovedAt ? ` · ${formatDateTime(item.mrApprovedAt)}` : ''}`}
          approving={reviewArtwork.isPending}
          onApprove={() => void approveArtwork(item.orderId, item.designId)}
          onReject={() => setRejecting({ kind: 'artwork', id: item.designId, orderId: item.orderId })}
          rejectLabel="Request changes"
        >
          <Detail label="Doctor">{item.recipientName ?? '—'}</Detail>
          <Detail label="Quantity">{item.quantity}</Detail>
          <Detail label="Vendor">{item.vendorName}</Detail>
          <Detail label="Proof">
            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Version {item.versionNo}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Detail>
        </RequestCard>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <MasterPageHeader title="Approvals" description="Quick Gift requests, doctor changes and artwork from your team, waiting on your decision." />

      {!isLoading && !doctorsLoading && !artworkLoading && total === 0 ? (
        <EmptyState icon={CheckSquare} title="Nothing pending" description="You're all caught up. New requests appear here." />
      ) : (
        <AppTabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            ...(canApproveQuickGifts
              ? [{ value: 'quickGift', label: 'Quick Gift requests', badge: quickGifts?.length || undefined, content: quickGiftPanel }]
              : []),
            { value: 'doctors', label: 'Doctor changes', badge: doctorRequests?.length || undefined, content: doctorPanel },
            { value: 'artwork', label: 'Artwork', badge: artwork?.length || undefined, content: artworkPanel },
          ]}
        />
      )}

      <AppDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null)
            setReason('')
          }
        }}
        size="sm"
        title={
          rejecting?.kind === 'artwork' ? 'Send artwork back to the vendor' : rejecting?.kind === 'doctor' ? 'Reject doctor change' : 'Reject Quick Gift request'
        }
        confirmLabel={rejecting?.kind === 'artwork' ? 'Send back to vendor' : 'Reject'}
        confirmVariant="destructive"
        cancelLabel="Cancel"
        confirmDisabled={!reason.trim()}
        loading={rejectQuickGift.isPending || rejectDoctor.isPending || reviewArtwork.isPending}
        onConfirm={() => void confirmReject()}
      >
        <LabelledField id="reject-reason" label={rejecting?.kind === 'artwork' ? 'What should change? (shown to the vendor)' : 'Reason (shown to the requester)'}>
          <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </LabelledField>
      </AppDialog>
      <PhotoLinkDialog prompt={photoPrompt} onClose={() => setPhotoPrompt(null)} />
    </div>
  )
}
