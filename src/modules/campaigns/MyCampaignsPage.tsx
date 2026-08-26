import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Submission } from '@/api/submissions'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useMySubmissions, useRequestPhotoLink } from '@/hooks/useSubmissions'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

function SubmissionDetailDialog({
  submission,
  onHide,
  onRequestPhotoLink,
  requesting,
}: {
  submission: Submission | null
  onHide: () => void
  onRequestPhotoLink: (submission: Submission) => void
  requesting: boolean
}) {
  const photo = submission?.attachments.find((a) => a.fieldKey === 'photo')

  return (
    <Dialog header={submission?.campaignName} visible={submission !== null} onHide={onHide} style={{ width: '32rem' }}>
      {submission && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}
            </span>
            <StatusBadge status={submission.status} label={humanize(submission.status)} />
          </div>

          {submission.giftName && (
            <div>
              <p className="text-xs text-text-muted">Gift</p>
              <p className="text-sm font-medium text-text">{submission.giftName}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            {submission.values.map((v) => (
              <div key={v.fieldKey}>
                <p className="text-xs text-text-muted">{v.label}</p>
                <p className="text-text">{Array.isArray(v.value) ? v.value.join(', ') : String(v.value ?? '—')}</p>
              </div>
            ))}
          </div>

          {submission.rejectionReason && (
            <p className="text-sm text-red-500 dark:text-red-400">Rejected: {submission.rejectionReason}</p>
          )}

          <div>
            <p className="mb-2 text-xs text-text-muted">Recipient's photo</p>
            {photo ? (
              <a href={photo.url} target="_blank" rel="noreferrer" className="inline-block">
                <img src={photo.url} alt={photo.fileName} className="h-32 w-32 rounded-lg border border-border object-cover" />
              </a>
            ) : (
              <div className="grid h-32 w-32 place-items-center rounded-lg border border-dashed border-border text-text-muted">
                <i className="pi pi-image text-2xl" />
              </div>
            )}
          </div>

          {submission.status === 'APPROVED' && (
            <Button
              label={photo ? "Photo not right? Send the link again" : 'Request a photo from the recipient'}
              icon="pi pi-send"
              outlined
              size="small"
              className="self-start"
              loading={requesting}
              onClick={() => onRequestPhotoLink(submission)}
            />
          )}
        </div>
      )}
    </Dialog>
  )
}

export function MyCampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: submissions } = useMySubmissions()
  const navigate = useNavigate()
  const requestPhotoLink = useRequestPhotoLink()

  const [viewing, setViewing] = useState<Submission | null>(null)
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)

  const active = (campaigns ?? []).filter((c) => c.status === 'ACTIVE')

  async function handleRequestPhotoLink(submission: Submission) {
    try {
      const result = await requestPhotoLink.mutateAsync(submission.id)
      const phone = submission.values.find((v) => v.fieldKey === 'recipientPhone')?.value
      const name = submission.values.find((v) => v.fieldKey === 'recipientName')?.value
      setPhotoLinkPrompt({
        link: result.recipientUploadUrl,
        phone: typeof phone === 'string' ? phone : null,
        recipientName: typeof name === 'string' ? name : null,
      })
      showToast({ severity: 'success', summary: 'Link sent to the recipient' })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div>
      <PageHeader title="My Campaigns" subtitle="Campaigns you can submit recipients into, and what you've already sent for approval." />

      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase">Open for submissions</h2>
      {!isLoading && active.length === 0 ? (
        <EmptyState icon="pi-megaphone" title="No open campaigns right now" description="Check back once your team starts a new one." />
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((campaign) => (
            <div key={campaign.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-text">{campaign.name}</span>
                <StatusBadge status={campaign.status} label="Open" />
              </div>
              <p className="text-xs text-text-muted">{humanize(campaign.purpose)} · {humanize(campaign.recipientCategory)}</p>
              {campaign.gifts.length > 0 && (
                <p className="text-xs text-text-muted">Gift{campaign.gifts.length > 1 ? 's' : ''}: {campaign.gifts.map((g) => g.name).join(', ')}</p>
              )}
              {campaign.instructions && <p className="line-clamp-2 text-sm text-text">{campaign.instructions}</p>}
              <Button
                label="Submit a recipient"
                icon="pi pi-send"
                size="small"
                className="mt-2 self-start"
                onClick={() => navigate(`/campaigns/${campaign.id}/submit`)}
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase">My submissions</h2>
      {submissions?.length === 0 ? (
        <EmptyState icon="pi-send" title="No submissions yet" description="Submissions you send for approval will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {submissions?.map((submission) => (
            <button
              key={submission.id}
              type="button"
              onClick={() => setViewing(submission)}
              className="rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-accent/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-text">{submission.campaignName}</span>
                <StatusBadge status={submission.status} label={humanize(submission.status)} />
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}
              </p>
              {submission.rejectionReason && (
                <p className="mt-2 text-sm text-red-500 dark:text-red-400">Rejected: {submission.rejectionReason}</p>
              )}
              {submission.status === 'REJECTED' && (
                <Button
                  label="Resubmit"
                  icon="pi pi-refresh"
                  size="small"
                  outlined
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/campaigns/${submission.campaignId}/submit`, {
                      state: {
                        resubmitId: submission.id,
                        initialGiftId: submission.giftId ?? undefined,
                        initialValues: Object.fromEntries(submission.values.map((v) => [v.fieldKey, v.value])),
                      },
                    })
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <SubmissionDetailDialog
        submission={viewing}
        onHide={() => setViewing(null)}
        onRequestPhotoLink={handleRequestPhotoLink}
        requesting={requestPhotoLink.isPending}
      />
      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
