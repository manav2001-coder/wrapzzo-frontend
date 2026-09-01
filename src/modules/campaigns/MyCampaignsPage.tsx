import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Campaign } from '@/api/campaigns'
import type { Submission, SubmissionStatus } from '@/api/submissions'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { SectionHeader } from '@/components/SectionHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useMySubmissions, useRequestPhotoLink } from '@/hooks/useSubmissions'
import { humanize } from '@/lib/format'
import { statusColor } from '@/lib/statusColors'
import { showApiError, showToast } from '@/lib/toast'

/** SUBMITTED and RESUBMITTED both just mean "waiting on your manager" -- one bucket for the chart and filter. */
function submissionBucket(status: SubmissionStatus): string {
  return status === 'SUBMITTED' || status === 'RESUBMITTED' ? 'PENDING' : status
}

const INSTRUCTIONS_WORD_LIMIT = 18

function truncateWords(text: string, limit: number): { preview: string; isTruncated: boolean } {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return { preview: text, isTruncated: false }
  return { preview: words.slice(0, limit).join(' ') + '…', isTruncated: true }
}

/**
 * Fixed-position "Submit a recipient" button across a row of cards -- instructions vary wildly
 * in length, so the text is capped to a preview with a "See more" toggle instead of letting the
 * card grow, and the button is pinned to the bottom via mt-auto regardless of how much text is
 * showing above it.
 */
function CampaignOpenCard({ campaign, onSubmit }: { campaign: Campaign; onSubmit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const { preview, isTruncated } = campaign.instructions ? truncateWords(campaign.instructions, INSTRUCTIONS_WORD_LIMIT) : { preview: '', isTruncated: false }

  return (
    <div className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-text">{campaign.name}</span>
        <StatusBadge status={campaign.status} label="Open" />
      </div>
      <p className="text-xs text-text-muted">{humanize(campaign.purpose)} · {humanize(campaign.recipientCategory)}</p>
      {campaign.gifts.length > 0 && (
        <p className="text-xs text-text-muted">Gift{campaign.gifts.length > 1 ? 's' : ''}: {campaign.gifts.map((g) => g.name).join(', ')}</p>
      )}
      {campaign.instructions && (
        <div className="text-sm text-text">
          <p>{expanded ? campaign.instructions : preview}</p>
          {isTruncated && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 border-none bg-transparent p-0 text-xs font-medium text-accent hover:underline"
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
        </div>
      )}
      <Button label="Submit a recipient" icon="pi pi-send" size="small" className="mt-auto self-start" onClick={onSubmit} />
    </div>
  )
}

function SubmissionRow({ submission, onView }: { submission: Submission; onView: () => void }) {
  return (
    <button
      type="button"
      onClick={onView}
      className="w-full cursor-pointer rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-accent/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-text">{submission.campaignName}</span>
        <StatusBadge status={submission.status} label={humanize(submission.status)} />
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}
      </p>
    </button>
  )
}

interface SubmissionGroup {
  campaignId: string
  campaignName: string
  items: Submission[]
}

/** One campaign's worth of submissions, collapsible -- so a Member with several campaigns can scan status at a glance without scrolling past every row. */
function SubmissionGroupCard({
  group,
  defaultCollapsed,
  onView,
}: {
  group: SubmissionGroup
  defaultCollapsed: boolean
  onView: (submission: Submission) => void
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of group.items) c[submissionBucket(s.status)] = (c[submissionBucket(s.status)] ?? 0) + 1
    return c
  }, [group.items])

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-none bg-transparent p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <i className={`pi ${collapsed ? 'pi-chevron-right' : 'pi-chevron-down'} shrink-0 text-xs text-text-muted`} />
          <span className="truncate font-semibold text-text">{group.campaignName}</span>
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">{group.items.length}</span>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {Object.entries(counts).map(([status, count]) => (
            <span
              key={status}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${statusColor(status)}1a`, color: statusColor(status) }}
            >
              {count} {humanize(status)}
            </span>
          ))}
        </div>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          {group.items.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} onView={() => onView(submission)} />
          ))}
        </div>
      )}
    </div>
  )
}

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
    <Dialog
      header={submission?.campaignName}
      visible={submission !== null}
      onHide={onHide}
      style={{ width: '32rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
    >
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const active = (campaigns ?? []).filter((c) => c.status === 'ACTIVE')

  const statusSlices = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of submissions ?? []) counts[submissionBucket(s.status)] = (counts[submissionBucket(s.status)] ?? 0) + 1
    return Object.entries(counts).map(([key, value]) => ({ key, name: humanize(key), value, color: statusColor(key) }))
  }, [submissions])
  const submissionsTotal = submissions?.length ?? 0

  const filtered = useMemo(
    () => (statusFilter ? (submissions ?? []).filter((s) => submissionBucket(s.status) === statusFilter) : (submissions ?? [])),
    [submissions, statusFilter],
  )

  const groups = useMemo<SubmissionGroup[]>(() => {
    const map = new Map<string, SubmissionGroup>()
    for (const s of filtered) {
      if (!map.has(s.campaignId)) map.set(s.campaignId, { campaignId: s.campaignId, campaignName: s.campaignName, items: [] })
      map.get(s.campaignId)!.items.push(s)
    }
    return Array.from(map.values()).sort((a, b) => {
      const latest = (g: SubmissionGroup) => Math.max(...g.items.map((i) => new Date(i.createdAt).getTime()))
      return latest(b) - latest(a)
    })
  }, [filtered])

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

      <SectionHeader eyebrow="Open" title="Open for submissions" />
      {!isLoading && active.length === 0 ? (
        <EmptyState icon="pi-megaphone" title="No open campaigns right now" description="Check back once your team starts a new one." />
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((campaign) => (
            <CampaignOpenCard key={campaign.id} campaign={campaign} onSubmit={() => navigate(`/campaigns/${campaign.id}/submit`)} />
          ))}
        </div>
      )}

      <SectionHeader eyebrow="Submissions" title="My submissions" />
      {submissions?.length === 0 ? (
        <EmptyState icon="pi-send" title="No submissions yet" description="Submissions you send for approval will show up here." />
      ) : (
        <>
          {/* A slim horizontal bar instead of a chart card -- stays this same compact size
              no matter how many campaigns/submissions pile up below it, unlike a donut card
              that either stretches to match a growing list or leaves dead space beside it. */}
          <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text">Submission status</p>
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setStatusFilter(null)}
                  className="flex items-center gap-1 border-none bg-transparent p-0 text-xs font-medium text-accent hover:underline"
                >
                  <i className="pi pi-filter-slash" /> Showing {humanize(statusFilter)} only — clear filter
                </button>
              )}
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
              {statusSlices.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  title={`${s.name}: ${s.value}`}
                  onClick={() => setStatusFilter((prev) => (prev === s.key ? null : s.key))}
                  style={{ width: `${(s.value / Math.max(submissionsTotal, 1)) * 100}%`, backgroundColor: s.color }}
                  className={`h-full border-none p-0 transition-opacity hover:opacity-80 ${statusFilter && statusFilter !== s.key ? 'opacity-30' : 'opacity-100'}`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {statusSlices.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatusFilter((prev) => (prev === s.key ? null : s.key))}
                  className={`flex items-center gap-1.5 border-none bg-transparent p-0 text-xs font-medium ${statusFilter && statusFilter !== s.key ? 'text-text-muted' : 'text-text'}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name} <span className="text-text-muted">({s.value})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {groups.length === 0 ? (
              <EmptyState icon="pi-filter-slash" title="No submissions match this filter" />
            ) : (
              groups.map((group) => (
                <SubmissionGroupCard key={group.campaignId} group={group} defaultCollapsed={groups.length > 3} onView={setViewing} />
              ))
            )}
          </div>
        </>
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
