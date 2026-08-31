import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { confirmDialog } from 'primereact/confirmdialog'
import { Dialog } from 'primereact/dialog'
import { InputTextarea } from 'primereact/inputtextarea'
import { MultiSelect } from 'primereact/multiselect'
import { ProgressSpinner } from 'primereact/progressspinner'
import { TabPanel, TabView } from 'primereact/tabview'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RecipientPhotoLinkDialog, type RecipientPhotoLinkPrompt } from '@/components/RecipientPhotoLinkDialog'
import { StatusBadge } from '@/components/StatusBadge'
import {
  useAudienceOptions,
  useCampaign,
  useReplaceCampaignAudience,
  useReplaceCampaignFields,
  useSetCampaignStatus,
  useUpdateCampaign,
} from '@/hooks/useCampaigns'
import { useApproveSubmission, useCampaignSubmissions, useRejectSubmission } from '@/hooks/useSubmissions'
import { useActiveGifts } from '@/hooks/useGifts'
import { humanize } from '@/lib/format'
import { ApiError } from '@/lib/axiosClient'
import { showApiError, showToast } from '@/lib/toast'
import { computeOrgUnitFrontier, OrgUnitCascadeSelector } from './OrgUnitCascadeSelector'
import { CampaignFieldsEditor, draftFromFields, type DraftField } from './CampaignFieldsEditor'
import type { Submission } from '@/api/submissions'

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const campaignId = id ?? ''
  const navigate = useNavigate()

  const { data: campaign, isLoading } = useCampaign(campaignId)
  const { data: audienceOptions } = useAudienceOptions()
  const { data: activeGifts } = useActiveGifts()
  const submissionsQuery = useCampaignSubmissions(campaignId)
  const setStatus = useSetCampaignStatus(campaignId)
  const replaceFields = useReplaceCampaignFields(campaignId)
  const replaceAudience = useReplaceCampaignAudience(campaignId)
  const updateCampaign = useUpdateCampaign(campaignId)
  const approve = useApproveSubmission()
  const reject = useRejectSubmission()

  const [fieldsDraft, setFieldsDraft] = useState<DraftField[] | null>(null)
  const [orgUnitIdsDraft, setOrgUnitIdsDraft] = useState<Set<string> | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [photoLinkPrompt, setPhotoLinkPrompt] = useState<RecipientPhotoLinkPrompt | null>(null)
  const [giftsDraft, setGiftsDraft] = useState<string[] | null>(null)

  // No per-user permission profile on the frontend yet -- this endpoint is the one
  // signal we have: it 403s for anyone without campaign.manage/campaign.approve, so a
  // rejection here means "field rep view", not "campaign has no submissions yet".
  const canManage = !(submissionsQuery.error instanceof ApiError && submissionsQuery.error.status === 403)

  if (isLoading || !campaign) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  const fields = fieldsDraft ?? draftFromFields(campaign.fields)
  const orgUnitIds =
    orgUnitIdsDraft ??
    new Set(campaign.audiences.filter((a) => a.type === 'ORG_UNIT' && a.orgUnitId).map((a) => a.orgUnitId as string))
  const audienceDirty = orgUnitIdsDraft !== null

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

  async function saveFields() {
    if (!fieldsDraft) return
    try {
      await replaceFields.mutateAsync(
        fieldsDraft.map((f, i) => ({
          fieldKey: f.fieldKey,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          placeholder: f.placeholder || undefined,
          options: f.options,
          displayOrder: i,
        })),
      )
      setFieldsDraft(null)
      showToast({ severity: 'success', summary: 'Fields saved' })
    } catch (error) {
      showApiError(error)
    }
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

  async function handleApprove(submissionId: string) {
    try {
      const result = await approve.mutateAsync(submissionId)
      showToast({ severity: 'success', summary: 'Submission approved', detail: 'An order has been created.' })
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
    if (!rejectingId || !rejectReason.trim()) return
    try {
      await reject.mutateAsync({ id: rejectingId, reason: rejectReason.trim() })
      showToast({ severity: 'success', summary: 'Submission rejected' })
      setRejectingId(null)
      setRejectReason('')
    } catch (error) {
      showApiError(error)
    }
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
            {canManage && campaign.status === 'DRAFT' && (
              <Button label="Activate" icon="pi pi-play" loading={setStatus.isPending} onClick={confirmActivate} />
            )}
            {canManage && campaign.status === 'ACTIVE' && (
              <Button label="Close campaign" icon="pi pi-lock" severity="danger" outlined loading={setStatus.isPending} onClick={confirmClose} />
            )}
            {campaign.status === 'ACTIVE' && (
              <Button label="Submit a recipient" icon="pi pi-send" onClick={() => navigate(`/campaigns/${campaignId}/submit`)} />
            )}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-0"><div className="p-3"><p className="text-xs text-text-muted">Purpose</p><p className="text-sm font-medium text-text">{humanize(campaign.purpose)}</p></div></Card>
        <Card className="p-0"><div className="p-3"><p className="text-xs text-text-muted">Recipients</p><p className="text-sm font-medium text-text">{humanize(campaign.recipientCategory)}</p></div></Card>
        <Card className="p-0">
          <div className="p-3">
            <div className="mb-1 flex items-center justify-between gap-1">
              <p className="text-xs text-text-muted">Gift(s)</p>
              {canManage && campaign.status === 'DRAFT' && giftsDraft === null && (
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => setGiftsDraft(campaign.gifts.map((g) => g.id))}
                >
                  Edit
                </button>
              )}
            </div>
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
              <div className="flex flex-wrap gap-1">
                {campaign.gifts.map((g) => (
                  <span key={g.id} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text">
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
        <Card className="p-0"><div className="p-3"><p className="text-xs text-text-muted">Deadline</p><p className="text-sm font-medium text-text">{campaign.submissionDeadline ? new Date(campaign.submissionDeadline).toLocaleDateString() : '—'}</p></div></Card>
      </div>

      {canManage ? (
        <TabView scrollable>
          <TabPanel header="Audience">
            <p className="mb-3 text-sm text-text-muted">Who can submit recipients into this campaign.</p>
            <OrgUnitCascadeSelector orgUnits={audienceOptions?.orgUnits ?? []} selected={orgUnitIds} onChange={setOrgUnitIdsDraft} />
            {audienceDirty && (
              <div className="mt-4 flex gap-2">
                <Button label="Save audience" icon="pi pi-check" loading={replaceAudience.isPending} onClick={saveAudience} />
                <Button label="Cancel" text onClick={() => setOrgUnitIdsDraft(null)} />
              </div>
            )}
          </TabPanel>

          <TabPanel header="Submission form">
            {campaign.status !== 'DRAFT' ? (
              <p className="mb-3 text-sm text-text-muted">
                Fields are locked once a campaign is active. Submissions may already reference them.
              </p>
            ) : (
              <p className="mb-3 text-sm text-text-muted">Edit the fields your team fills in when submitting a recipient.</p>
            )}
            <CampaignFieldsEditor fields={fields} onChange={setFieldsDraft} disabled={campaign.status !== 'DRAFT'} />
            {fieldsDraft && (
              <div className="mt-4 flex gap-2">
                <Button label="Save fields" icon="pi pi-check" loading={replaceFields.isPending} onClick={saveFields} />
                <Button label="Cancel" text onClick={() => setFieldsDraft(null)} />
              </div>
            )}
          </TabPanel>

          <TabPanel header={`Submissions${submissionsQuery.data ? ` (${submissionsQuery.data.length})` : ''}`}>
            {submissionsQuery.isLoading ? (
              <ProgressSpinner style={{ width: 32, height: 32 }} strokeWidth="4" />
            ) : submissionsQuery.data?.length === 0 ? (
              <EmptyState
                icon="pi-inbox"
                title="No submissions yet"
                description="Recipients submitted by your team for this campaign will appear here."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {submissionsQuery.data?.map((submission: Submission) => (
                  <div key={submission.id} className="rounded-lg border border-border p-4">
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
                    {submission.rejectionReason && (
                      <p className="mt-2 text-sm text-red-500 dark:text-red-400">Rejected: {submission.rejectionReason}</p>
                    )}
                    {(submission.status === 'SUBMITTED' || submission.status === 'RESUBMITTED') && (
                      <div className="mt-3 flex gap-2">
                        <Button label="Approve" icon="pi pi-check" size="small" loading={approve.isPending} onClick={() => handleApprove(submission.id)} />
                        <Button
                          label="Reject"
                          icon="pi pi-times"
                          size="small"
                          severity="danger"
                          outlined
                          onClick={() => setRejectingId(submission.id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabPanel>
        </TabView>
      ) : (
        <p className="text-sm text-text-muted">
          You're in the audience for this campaign.{' '}
          {campaign.status === 'ACTIVE' ? 'Use "Submit a recipient" above to add one.' : 'It is not currently accepting submissions.'}
        </p>
      )}

      <Dialog header="Reject submission" visible={rejectingId !== null} onHide={() => setRejectingId(null)} style={{ width: '28rem' }}>
        <div className="flex flex-col gap-3">
          <label htmlFor="rejectReason" className="text-sm font-medium text-text">
            Reason (shown to the submitter)
          </label>
          <InputTextarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" text onClick={() => setRejectingId(null)} />
            <Button label="Reject" severity="danger" disabled={!rejectReason.trim()} loading={reject.isPending} onClick={handleReject} />
          </div>
        </div>
      </Dialog>

      <RecipientPhotoLinkDialog prompt={photoLinkPrompt} onHide={() => setPhotoLinkPrompt(null)} />
    </div>
  )
}
