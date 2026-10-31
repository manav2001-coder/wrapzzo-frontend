import type { ColumnDef } from '@tanstack/react-table'
import { Eye, ImageOff, Megaphone, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { Campaign } from '@/api/campaigns'
import type { Submission, SubmissionStatus } from '@/api/submissions'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { PhotoLinkDialog, type PhotoLinkPrompt } from '@/components/orders/photo-link-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useMySubmissions, useRequestPhotoLink } from '@/hooks/useSubmissions'
import { formatDateTime } from '@/lib/datetime'
import { humanize } from '@/lib/format'
import type { ListFieldMap } from '@/lib/list-fields'
import { SubmissionStatusBadge } from './submission-card'

const LIST_FIELDS: ListFieldMap = { campaignName: 'text', giftName: 'text', recipient: 'text', status: 'enum' }

const STATUSES: SubmissionStatus[] = ['SUBMITTED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'DRAFT']

const valueOf = (submission: Submission, key: string) => {
  const value = submission.values.find((v) => v.fieldKey === key)?.value
  return typeof value === 'string' ? value : null
}

function OpenCampaignCard({ campaign, onSubmit }: { campaign: Campaign; onSubmit: () => void }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{campaign.name}</h3>
        <Badge variant="success-soft">Open</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {humanize(campaign.purpose)} · {humanize(campaign.recipientCategory)}
      </p>
      {campaign.gifts.length > 0 && <p className="text-xs text-muted-foreground">Gifts: {campaign.gifts.map((g) => g.name).join(', ')}</p>}
      {campaign.instructions && <p className="line-clamp-3 text-sm" title={campaign.instructions}>{campaign.instructions}</p>}
      <Button size="sm" className="mt-auto self-start" onClick={onSubmit}>
        <Send />
        Submit a recipient
      </Button>
    </article>
  )
}

/** What a member can submit into, and everything they have already submitted. */
export function MyCampaignsPage() {
  const navigate = useNavigate()
  const showError = useApiErrorToast()
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: submissions, isLoading: submissionsLoading, error, refetch } = useMySubmissions()
  const requestPhotoLink = useRequestPhotoLink()
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [photoPrompt, setPhotoPrompt] = useState<PhotoLinkPrompt | null>(null)

  const open = (campaigns ?? []).filter((c) => c.status === 'ACTIVE')
  const viewing = submissions?.find((s) => s.id === viewingId) ?? null
  const photo = viewing?.attachments.find((a) => a.fieldKey === 'photo')

  async function sendPhotoLink(submission: Submission) {
    try {
      const result = await requestPhotoLink.mutateAsync(submission.id)
      setPhotoPrompt({ link: result.recipientUploadUrl, phone: valueOf(submission, 'recipientPhone'), recipientName: valueOf(submission, 'recipientName') })
      toast.success('Link sent to the recipient')
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<Submission, unknown>[]>(
    () => [
      {
        id: 'campaignName',
        accessorKey: 'campaignName',
        header: 'Campaign',
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) => (
          <button type="button" className="font-medium hover:underline" onClick={() => setViewingId(row.original.id)}>
            {row.original.campaignName}
          </button>
        ),
      },
      { id: 'recipient', accessorFn: (s) => valueOf(s, 'recipientName') ?? '', header: 'Recipient', meta: { className: 'min-w-[160px]' } },
      { id: 'giftName', accessorFn: (s) => s.giftName ?? '', header: 'Gift', meta: { className: 'min-w-[160px]' } },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: 'equals',
        meta: { className: 'min-w-[130px]', filterVariant: 'select', filterOptions: STATUSES.map((value) => ({ value, label: humanize(value) })) },
        cell: ({ row }) => <SubmissionStatusBadge status={row.original.status} />,
      },
      {
        id: 'submittedAt',
        accessorFn: (s) => s.submittedAt ?? s.createdAt,
        header: 'Submitted',
        enableColumnFilter: false,
        meta: { className: 'min-w-[150px]' },
        cell: ({ row }) => formatDateTime(row.original.submittedAt ?? row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Eye} label={`View ${row.original.campaignName}`} onClick={() => setViewingId(row.original.id)} />,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <MasterPageHeader title="My campaigns" description="Campaigns you can submit recipients into, and what you have already sent." />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Open for submissions</h2>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : open.length === 0 ? (
          <EmptyState icon={Megaphone} title="No open campaigns right now" description="Check back once your team starts a new one." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((campaign) => (
              <OpenCampaignCard key={campaign.id} campaign={campaign} onSubmit={() => navigate(`/campaigns/${campaign.id}/submit`)} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">My submissions</h2>
        <DataTable<Submission>
          columns={columns}
          data={submissions ?? []}
          isLoading={submissionsLoading}
          listFields={LIST_FIELDS}
          searchable
          showRowSelectionColumn={false}
          defaultSort={{ id: 'submittedAt', desc: true }}
          getRowId={(s) => s.id}
          tableId="my-submissions"
          configNamespace="my-submissions"
          emptyState={listEmptyBody({
            error,
            onRetry: () => void refetch(),
            icon: <Send className="h-8 w-8 opacity-50" />,
            message: 'No submissions yet',
            description: 'Recipients you submit into a campaign show up here.',
          })}
        />
      </section>

      <Sheet open={viewing !== null} onOpenChange={(isOpen) => !isOpen && setViewingId(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {viewing && (
            <>
              <SheetHeader className="border-b px-6 py-4 pr-10 text-left">
                <SheetTitle>{viewing.campaignName}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  {formatDateTime(viewing.submittedAt ?? viewing.createdAt)}
                  <SubmissionStatusBadge status={viewing.status} />
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <dl className="grid grid-cols-2 gap-4">
                  {viewing.giftName && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Gift</dt>
                      <dd className="text-sm font-medium">{viewing.giftName}</dd>
                    </div>
                  )}
                  {viewing.values.map((v) => (
                    <div key={v.fieldKey} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{v.label}</dt>
                      <dd className="text-sm font-medium break-words">{Array.isArray(v.value) ? v.value.join(', ') : String(v.value ?? '—')}</dd>
                    </div>
                  ))}
                </dl>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Recipient's photo</h3>
                  {photo ? (
                    <a href={photo.url} target="_blank" rel="noreferrer" className="inline-block">
                      <img src={photo.url} alt={photo.fileName} className="h-36 w-36 rounded-md border object-cover" />
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageOff className="h-4 w-4" />
                      No photo yet.
                    </p>
                  )}
                  {viewing.status === 'APPROVED' && (
                    <Button variant="outline" size="sm" loading={requestPhotoLink.isPending} onClick={() => void sendPhotoLink(viewing)}>
                      <Send />
                      {photo ? 'Photo not right? Send the link again' : 'Ask the recipient for a photo'}
                    </Button>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <PhotoLinkDialog prompt={photoPrompt} onClose={() => setPhotoPrompt(null)} />
    </div>
  )
}
