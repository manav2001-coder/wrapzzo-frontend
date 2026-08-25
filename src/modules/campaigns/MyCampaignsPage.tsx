import { Button } from 'primereact/button'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useMySubmissions } from '@/hooks/useSubmissions'
import { humanize } from '@/lib/format'

export function MyCampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: submissions } = useMySubmissions()
  const navigate = useNavigate()

  const active = (campaigns ?? []).filter((c) => c.status === 'ACTIVE')

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
            <div key={submission.id} className="rounded-lg border border-border bg-surface p-4">
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
                  onClick={() =>
                    navigate(`/campaigns/${submission.campaignId}/submit`, {
                      state: {
                        resubmitId: submission.id,
                        initialGiftId: submission.giftId ?? undefined,
                        initialValues: Object.fromEntries(submission.values.map((v) => [v.fieldKey, v.value])),
                      },
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
