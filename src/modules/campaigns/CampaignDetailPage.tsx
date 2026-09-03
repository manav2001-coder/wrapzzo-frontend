import { Button } from 'primereact/button'
import { confirmDialog } from 'primereact/confirmdialog'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { MultiSelect } from 'primereact/multiselect'
import { ProgressSpinner } from 'primereact/progressspinner'
import { TabPanel, TabView } from 'primereact/tabview'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Submission } from '@/api/submissions'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useActiveGifts } from '@/hooks/useGifts'
import {
  useAudienceOptions,
  useCampaign,
  useReplaceCampaignAudience,
  useSetCampaignStatus,
  useUpdateCampaign,
} from '@/hooks/useCampaigns'
import { useHasPermission } from '@/hooks/usePermissions'
import { useCampaignSubmissions, useMySubmissions } from '@/hooks/useSubmissions'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'
import { computeOrgUnitFrontier, OrgUnitCascadeSelector, type OrgUnitOption } from './OrgUnitCascadeSelector'

/**
 * The saved audience only stores the deepest checked org unit per branch (see
 * computeOrgUnitFrontier) -- every ancestor is deliberately dropped from what's persisted,
 * since it's implied by the leaf. OrgUnitCascadeSelector, though, needs every ancestor's id
 * literally present in `selected`: it's what both reveals each deeper level in the tree and
 * marks each row's own checkbox as checked. Re-derive that full set here by walking each
 * saved id back up to the root via parentId, or every level above the one actually saved
 * renders as an unchecked, invisible-until-expanded row instead of reflecting what was saved.
 */
function expandWithAncestors(orgUnitIds: string[], orgUnits: OrgUnitOption[]): Set<string> {
  const byId = new Map(orgUnits.map((o) => [o.id, o]))
  const expanded = new Set<string>()
  for (const id of orgUnitIds) {
    let current: string | null | undefined = id
    while (current && !expanded.has(current)) {
      expanded.add(current)
      current = byId.get(current)?.parentId
    }
  }
  return expanded
}

/** One submission's detail card -- shared by the manager "Submissions" tab (everyone's) and a
 * Member's own-submissions view (just theirs, for this one campaign). */
function SubmissionCard({ submission }: { submission: Submission }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-text">{submission.submittedByName}</span>
          <span className="ml-2 text-xs text-text-muted">
            {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}
          </span>
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
      {submission.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {submission.attachments.map((a) => (
            <a key={a.fieldKey} href={a.url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
              {a.label}: {a.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionList({
  submissions,
  isLoading,
  emptyTitle = 'No submissions yet',
  emptyDescription,
}: {
  submissions: Submission[] | undefined
  isLoading: boolean
  emptyTitle?: string
  emptyDescription: string
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <ProgressSpinner style={{ width: 32, height: 32 }} strokeWidth="4" />
      </div>
    )
  }
  if (!submissions || submissions.length === 0) {
    return <EmptyState icon="pi-inbox" title={emptyTitle} description={emptyDescription} />
  }
  return (
    <div className="flex flex-col gap-3">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  )
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const campaignId = id ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const { tab } = (location.state as { tab?: 'submissions' } | null) ?? {}

  // Mirrors the backend exactly: the Audience tab's endpoint requires campaign.manage
  // specifically; the Submissions list accepts campaign.manage OR campaign.approve. Deciding
  // this synchronously from the already-cached permission list -- instead of the old approach
  // of optimistically showing both tabs and only discovering a 403 after the Submissions
  // query failed -- is what stops the whole tab view from disappearing out from under a
  // Member mid-click.
  const canManageAudience = useHasPermission('campaign.manage')
  const hasApprove = useHasPermission('campaign.approve')
  const canReviewSubmissions = canManageAudience || hasApprove
  const showManagerView = canManageAudience || canReviewSubmissions

  const [activeIndex, setActiveIndex] = useState(tab === 'submissions' && canManageAudience ? 1 : 0)

  const { data: campaign, isLoading } = useCampaign(campaignId)
  const { data: audienceOptions } = useAudienceOptions(canManageAudience)
  const { data: activeGifts } = useActiveGifts()
  const submissionsQuery = useCampaignSubmissions(campaignId, canReviewSubmissions)
  const mySubmissionsQuery = useMySubmissions()
  const setStatus = useSetCampaignStatus(campaignId)
  const replaceAudience = useReplaceCampaignAudience(campaignId)
  const updateCampaign = useUpdateCampaign(campaignId)

  const [orgUnitIdsDraft, setOrgUnitIdsDraft] = useState<Set<string> | null>(null)
  const [giftsDraft, setGiftsDraft] = useState<string[] | null>(null)
  const [submissionSearch, setSubmissionSearch] = useState('')

  if (isLoading || !campaign) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  const giftImageById = new Map((activeGifts ?? []).map((g) => [g.id, g.images[0]?.imageUrl]))

  const orgUnitIds =
    orgUnitIdsDraft ??
    expandWithAncestors(
      campaign.audiences.filter((a) => a.type === 'ORG_UNIT' && a.orgUnitId).map((a) => a.orgUnitId as string),
      audienceOptions?.orgUnits ?? [],
    )
  const audienceDirty = orgUnitIdsDraft !== null
  const myCampaignSubmissions = (mySubmissionsQuery.data ?? []).filter((s) => s.campaignId === campaignId)

  const submissionSearchQuery = submissionSearch.trim().toLowerCase()
  const filteredSubmissions = !submissionSearchQuery
    ? submissionsQuery.data
    : (submissionsQuery.data ?? []).filter((s) => {
        const haystack = [s.submittedByName, ...s.values.map((v) => (Array.isArray(v.value) ? v.value.join(' ') : String(v.value ?? '')))]
        return haystack.some((value) => value.toLowerCase().includes(submissionSearchQuery))
      })

  function confirmActivate() {
    confirmDialog({
      header: 'Activate campaign',
      message: 'Once active, people in the audience can submit recipients. You can still edit the audience afterward.',
      icon: 'pi pi-play',
      accept: async () => {
        try {
          await setStatus.mutateAsync('ACTIVE')
          showToast({ severity: 'success', summary: 'Campaign activated' })
        } catch (error) {
          showApiError(error)
        }
      },
    })
  }

  function confirmClose() {
    confirmDialog({
      header: 'Close campaign',
      message: 'No new submissions or orders can be created from this campaign afterward. Orders already in flight continue.',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await setStatus.mutateAsync('CLOSED')
          showToast({ severity: 'success', summary: 'Campaign closed' })
        } catch (error) {
          showApiError(error)
        }
      },
    })
  }

  async function saveAudience() {
    if (!audienceDirty) return
    const frontier = computeOrgUnitFrontier(orgUnitIds, audienceOptions?.orgUnits ?? [])
    try {
      await replaceAudience.mutateAsync(frontier.map((orgUnitId) => ({ type: 'ORG_UNIT' as const, orgUnitId })))
      setOrgUnitIdsDraft(null)
      showToast({ severity: 'success', summary: 'Audience saved' })
    } catch (error) {
      showApiError(error)
    }
  }

  async function saveGifts() {
    if (!giftsDraft || giftsDraft.length === 0 || !campaign) return
    try {
      await updateCampaign.mutateAsync({
        name: campaign.name,
        purpose: campaign.purpose,
        recipientCategory: campaign.recipientCategory,
        giftIds: giftsDraft,
        instructions: campaign.instructions ?? undefined,
        submissionDeadline: campaign.submissionDeadline ?? undefined,
      })
      setGiftsDraft(null)
      showToast({ severity: 'success', summary: 'Gifts updated' })
    } catch (error) {
      showApiError(error)
    }
  }

  const panels = []
  if (canManageAudience) {
    panels.push(
      <TabPanel key="audience" header="Audience">
        <p className="mb-3 text-sm text-text-muted">Who can submit recipients into this campaign.</p>
        <OrgUnitCascadeSelector orgUnits={audienceOptions?.orgUnits ?? []} selected={orgUnitIds} onChange={setOrgUnitIdsDraft} />
        {audienceDirty && (
          <div className="mt-4 flex gap-2">
            <Button label="Save audience" icon="pi pi-check" loading={replaceAudience.isPending} onClick={saveAudience} />
            <Button label="Cancel" text onClick={() => setOrgUnitIdsDraft(null)} />
          </div>
        )}
      </TabPanel>,
    )
  }
  if (canReviewSubmissions) {
    panels.push(
      <TabPanel key="submissions" header={`Submissions${submissionsQuery.data ? ` (${submissionsQuery.data.length})` : ''}`}>
        {submissionsQuery.data && submissionsQuery.data.length > 0 && (
          <div className="mb-4">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder="Search by submitter or recipient details"
                className="w-full sm:w-80"
              />
            </IconField>
          </div>
        )}
        <SubmissionList
          submissions={filteredSubmissions}
          isLoading={submissionsQuery.isLoading}
          emptyTitle={submissionSearchQuery ? 'No submissions match' : 'No submissions yet'}
          emptyDescription={
            submissionSearchQuery
              ? 'Try a different name or search term.'
              : 'Recipients submitted by your team for this campaign will appear here.'
          }
        />
      </TabPanel>,
    )
  }

  return (
    <div>
      <PageHeader
        title={`${campaign.displayId} · ${campaign.name}`}
        subtitle={campaign.instructions ?? undefined}
        backTo="/campaigns"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={campaign.status} label={humanize(campaign.status)} />
            {canManageAudience && campaign.status === 'DRAFT' && (
              <Button label="Activate" icon="pi pi-play" loading={setStatus.isPending} onClick={confirmActivate} />
            )}
            {canManageAudience && campaign.status === 'ACTIVE' && (
              <Button
                label="Close campaign"
                icon="pi pi-lock"
                severity="danger"
                outlined
                loading={setStatus.isPending}
                onClick={confirmClose}
              />
            )}
            {campaign.status === 'ACTIVE' && (
              <Button label="Submit a recipient" icon="pi pi-send" onClick={() => navigate(`/campaigns/${campaignId}/submit`)} />
            )}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
            <i className="pi pi-bullseye text-sm" />
          </div>
          <p className="text-xs text-text-muted">Purpose</p>
          <p className="mt-0.5 text-sm font-semibold text-text">{humanize(campaign.purpose)}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-500">
            <i className="pi pi-users text-sm" />
          </div>
          <p className="text-xs text-text-muted">Recipients</p>
          <p className="mt-0.5 text-sm font-semibold text-text">{humanize(campaign.recipientCategory)}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2.5 flex items-center justify-between gap-1">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-500">
              <i className="pi pi-gift text-sm" />
            </div>
            {canManageAudience && campaign.status === 'DRAFT' && giftsDraft === null && (
              <button
                type="button"
                className="text-xs font-medium text-accent hover:underline"
                onClick={() => setGiftsDraft(campaign.gifts.map((g) => g.id))}
              >
                Edit
              </button>
            )}
          </div>
          <p className="mb-1.5 text-xs text-text-muted">Gift(s)</p>
          {giftsDraft !== null ? (
            <div className="flex flex-col gap-2">
              <MultiSelect
                value={giftsDraft}
                onChange={(e) => setGiftsDraft(e.value)}
                options={(activeGifts ?? []).map((g) => ({ label: g.name, value: g.id }))}
                display="chip"
                filter
                className="w-full text-sm"
                placeholder="Select at least one"
              />
              <div className="flex gap-2">
                <Button label="Save" size="small" loading={updateCampaign.isPending} disabled={giftsDraft.length === 0} onClick={saveGifts} />
                <Button label="Cancel" text size="small" onClick={() => setGiftsDraft(null)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {campaign.gifts.map((g) => {
                const imageUrl = giftImageById.get(g.id)
                return (
                  <div key={g.id} className="flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pr-2.5 pl-1">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <i className="pi pi-gift text-[9px]" />
                      </span>
                    )}
                    <span className="max-w-[110px] truncate text-xs font-medium text-text" title={g.name}>
                      {g.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-500">
            <i className="pi pi-calendar text-sm" />
          </div>
          <p className="text-xs text-text-muted">Deadline</p>
          <p className="mt-0.5 text-sm font-semibold text-text">
            {campaign.submissionDeadline ? new Date(campaign.submissionDeadline).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      {showManagerView ? (
        <TabView scrollable activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
          {panels}
        </TabView>
      ) : (
        <div>
          <p className="mb-3 text-sm text-text-muted">
            You're in the audience for this campaign.{' '}
            {campaign.status === 'ACTIVE'
              ? 'Use "Submit a recipient" above to add one, or see what you\'ve already sent below.'
              : 'It is not currently accepting submissions.'}
          </p>
          <SubmissionList
            submissions={myCampaignSubmissions}
            isLoading={mySubmissionsQuery.isLoading}
            emptyDescription="Recipients you submit for this campaign will show up here."
          />
        </div>
      )}
    </div>
  )
}
