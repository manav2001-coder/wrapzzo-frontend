import { ArrowLeft, CalendarDays, Check, Gift, Lock, Pencil, Play, Search, Send, Target, Users, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { AppTabs } from '@/components/app-tabs'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { P } from '@/lib/permissions'
import { useAudienceOptions, useCampaign, useReplaceCampaignAudience, useSetCampaignStatus, useUpdateCampaign } from '@/hooks/useCampaigns'
import { useActiveGifts } from '@/hooks/useGifts'
import { useCampaignSubmissions, useMySubmissions } from '@/hooks/useSubmissions'
import { formatDate } from '@/lib/datetime'
import { humanize } from '@/lib/format'
import { GiftThumbnail } from '@/modules/admin/gifts/GiftThumbnail'
import { CampaignGiftPicker } from './CampaignGiftPicker'
import { CampaignStatusBadge } from './campaign-status'
import { computeOrgUnitFrontier, OrgUnitCascadeSelector, type OrgUnitOption } from './OrgUnitCascadeSelector'
import { SubmissionList } from './submission-card'

/**
 * The saved audience stores only the deepest checked org unit per branch (computeOrgUnitFrontier),
 * but the selector needs every ancestor present to reveal each level and tick each row. Walk each
 * saved id back up to the root via parentId to rebuild that set.
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

function Fact({ icon: Icon, label, children, action }: { icon: LucideIcon; label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {action}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold">{children}</div>
      </CardContent>
    </Card>
  )
}

type Confirming = 'activate' | 'close' | null

/** One campaign: its facts, lifecycle actions, and -- by permission -- its audience and submissions, or the member's own. */
export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const campaignId = id ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const showError = useApiErrorToast()
  const { tab: requestedTab } = (location.state as { tab?: 'submissions' } | null) ?? {}

  // Mirrors the backend: each button takes its own action -- edit (gifts, audience), publish
  // (activate/close), campaign_entry.submit (submit) -- and the entries list campaign_entry.view.
  const canEdit = useHasAccess(P.CAMPAIGN_EDIT)
  const canPublish = useHasAccess(P.CAMPAIGN_PUBLISH)
  const canSubmit = useHasAccess(P.CAMPAIGN_ENTRY_SUBMIT)
  const canReviewSubmissions = useHasAccess(P.CAMPAIGN_ENTRY_VIEW)

  const { data: campaign, isLoading } = useCampaign(campaignId)
  const { data: audienceOptions } = useAudienceOptions(canEdit)
  const { data: activeGifts } = useActiveGifts()
  const submissionsQuery = useCampaignSubmissions(campaignId, canReviewSubmissions)
  const mySubmissionsQuery = useMySubmissions()
  const setStatus = useSetCampaignStatus(campaignId)
  const replaceAudience = useReplaceCampaignAudience(campaignId)
  const updateCampaign = useUpdateCampaign(campaignId)

  const [tab, setTab] = useState(requestedTab === 'submissions' || !canEdit ? 'submissions' : 'audience')
  const [orgUnitIdsDraft, setOrgUnitIdsDraft] = useState<Set<string> | null>(null)
  const [giftsDraft, setGiftsDraft] = useState<string[] | null>(null)
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState<Confirming>(null)

  if (isLoading || !campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const orgUnits = audienceOptions?.orgUnits ?? []
  const orgUnitIds =
    orgUnitIdsDraft ??
    expandWithAncestors(
      campaign.audiences.filter((a) => a.type === 'ORG_UNIT' && a.orgUnitId).map((a) => a.orgUnitId as string),
      orgUnits,
    )
  const myCampaignSubmissions = (mySubmissionsQuery.data ?? []).filter((s) => s.campaignId === campaignId)
  const giftById = new Map((activeGifts ?? []).map((g) => [g.id, g]))

  const q = search.trim().toLowerCase()
  const filteredSubmissions = !q
    ? submissionsQuery.data
    : (submissionsQuery.data ?? []).filter((s) =>
        [s.submittedByName, ...s.values.map((v) => (Array.isArray(v.value) ? v.value.join(' ') : String(v.value ?? '')))].some((value) =>
          value.toLowerCase().includes(q),
        ),
      )

  async function confirmStatus() {
    const next = confirming === 'activate' ? 'ACTIVE' : 'CLOSED'
    try {
      await setStatus.mutateAsync(next)
      toast.success(next === 'ACTIVE' ? 'Campaign activated' : 'Campaign closed')
    } catch (err) {
      showError(err)
    } finally {
      setConfirming(null)
    }
  }

  async function saveAudience() {
    const frontier = computeOrgUnitFrontier(orgUnitIds, orgUnits)
    try {
      await replaceAudience.mutateAsync(frontier.map((orgUnitId) => ({ type: 'ORG_UNIT' as const, orgUnitId })))
      setOrgUnitIdsDraft(null)
      toast.success('Audience saved')
    } catch (err) {
      showError(err)
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
      toast.success('Gifts updated')
    } catch (err) {
      showError(err)
    }
  }

  const submissionsPanel = (
    <div className="space-y-3">
      {submissionsQuery.data && submissionsQuery.data.length > 0 && (
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by submitter or recipient details"
            aria-label="Search submissions"
            className="pl-8"
          />
        </div>
      )}
      <SubmissionList
        submissions={filteredSubmissions}
        isLoading={submissionsQuery.isLoading}
        emptyTitle={q ? 'No submissions match' : 'No submissions yet'}
        emptyDescription={q ? 'Try a different name or search term.' : 'Recipients submitted by your team for this campaign will appear here.'}
      />
    </div>
  )

  const audiencePanel = (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Who can submit recipients into this campaign.</p>
      <OrgUnitCascadeSelector orgUnits={orgUnits} selected={orgUnitIds} onChange={setOrgUnitIdsDraft} />
      {orgUnitIdsDraft !== null && (
        <div className="flex gap-2">
          <Button loading={replaceAudience.isPending} onClick={() => void saveAudience()}>
            <Check />
            Save audience
          </Button>
          <Button variant="ghost" onClick={() => setOrgUnitIdsDraft(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4 pb-6">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label="Campaigns" onClick={() => navigate('/campaigns')} />}
        title={`${campaign.displayId} · ${campaign.name}`}
        description={campaign.instructions ?? undefined}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            {canPublish && campaign.status === 'DRAFT' && (
              <Button size="sm" className="h-9" onClick={() => setConfirming('activate')}>
                <Play />
                Activate
              </Button>
            )}
            {canPublish && campaign.status === 'ACTIVE' && (
              <Button size="sm" variant="outline" className="h-9" onClick={() => setConfirming('close')}>
                <Lock />
                Close campaign
              </Button>
            )}
            {canSubmit && campaign.status === 'ACTIVE' && (
              <Button size="sm" className="h-9" onClick={() => navigate(`/campaigns/${campaignId}/submit`)}>
                <Send />
                Submit a recipient
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fact icon={Target} label="Purpose">
          {humanize(campaign.purpose)}
        </Fact>
        <Fact icon={Users} label="Recipients">
          {humanize(campaign.recipientCategory)}
        </Fact>
        <Fact
          icon={Gift}
          label="Gift(s)"
          action={
            canEdit &&
            campaign.status === 'DRAFT' && (
              <IconButton icon={Pencil} label="Edit gifts" onClick={() => setGiftsDraft(campaign.gifts.map((g) => g.id))} />
            )
          }
        >
          <div className="flex flex-wrap gap-1.5 font-normal">
            {campaign.gifts.map((g) => {
              const full = giftById.get(g.id)
              return (
                <span key={g.id} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2.5 pl-0.5 text-xs font-medium">
                  {full ? <GiftThumbnail gift={full} size={20} /> : <Gift className="h-4 w-4" />}
                  <span className="max-w-[120px] truncate" title={g.name}>
                    {g.name}
                  </span>
                </span>
              )
            })}
          </div>
        </Fact>
        <Fact icon={CalendarDays} label="Deadline">
          {campaign.submissionDeadline ? formatDate(campaign.submissionDeadline) : '—'}
        </Fact>
      </div>

      {canReviewSubmissions ? (
        <AppTabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            ...(canEdit ? [{ value: 'audience', label: 'Audience', content: audiencePanel }] : []),
            { value: 'submissions', label: 'Submissions', badge: submissionsQuery.data?.length || undefined, content: submissionsPanel },
          ]}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You're in the audience for this campaign.{' '}
            {campaign.status === 'ACTIVE'
              ? 'Use "Submit a recipient" to add one, or see what you have already sent below.'
              : 'It is not accepting submissions right now.'}
          </p>
          <SubmissionList
            submissions={myCampaignSubmissions}
            isLoading={mySubmissionsQuery.isLoading}
            emptyDescription="Recipients you submit for this campaign will show up here."
          />
        </div>
      )}

      <AppDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        size="sm"
        title={confirming === 'activate' ? 'Activate campaign?' : 'Close campaign?'}
        description={
          confirming === 'activate'
            ? 'People in the audience can then submit recipients. You can still edit the audience afterwards.'
            : 'No new submissions or orders can come from this campaign afterwards. Orders already in flight continue.'
        }
        confirmLabel={confirming === 'activate' ? 'Activate' : 'Close campaign'}
        confirmVariant={confirming === 'close' ? 'destructive' : 'default'}
        cancelLabel="Cancel"
        loading={setStatus.isPending}
        onConfirm={() => void confirmStatus()}
      />

      <AppDialog
        open={giftsDraft !== null}
        onOpenChange={(open) => !open && setGiftsDraft(null)}
        size="xl"
        title="Edit gifts"
        description="Choose the gift(s) this campaign offers."
        confirmLabel="Save gifts"
        cancelLabel="Cancel"
        confirmDisabled={!giftsDraft || giftsDraft.length === 0}
        loading={updateCampaign.isPending}
        onConfirm={() => void saveGifts()}
      >
        {giftsDraft && <CampaignGiftPicker selectedIds={giftsDraft} onChange={setGiftsDraft} />}
      </AppDialog>
    </div>
  )
}
