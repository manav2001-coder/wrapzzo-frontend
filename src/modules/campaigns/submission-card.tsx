import { Inbox, Paperclip } from 'lucide-react'

import type { Submission, SubmissionStatus } from '@/api/submissions'
import { EmptyState } from '@/components/empty-state'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/datetime'
import { humanize } from '@/lib/format'

const VARIANT: Record<SubmissionStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary-soft',
  SUBMITTED: 'primary-soft',
  RESUBMITTED: 'primary-soft',
  REJECTED: 'destructive-soft',
  APPROVED: 'success-soft',
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {humanize(status)}
    </Badge>
  )
}

/** One submission: who sent it, when, the gift chosen and every answer -- shared by the manager and member views. */
export function SubmissionCard({ submission }: { submission: Submission }) {
  return (
    <article className="rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-medium">{submission.submittedByName}</span>
          {submission.submittedAt && <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(submission.submittedAt)}</span>}
        </p>
        <SubmissionStatusBadge status={submission.status} />
      </header>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {submission.giftName && (
          <div>
            <dt className="inline text-muted-foreground">Gift: </dt>
            <dd className="inline font-medium">{submission.giftName}</dd>
          </div>
        )}
        {submission.values.map((v) => (
          <div key={v.fieldKey}>
            <dt className="inline text-muted-foreground">{v.label}: </dt>
            <dd className="inline">{Array.isArray(v.value) ? v.value.join(', ') : String(v.value ?? '—')}</dd>
          </div>
        ))}
      </dl>
      {submission.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {submission.attachments.map((a) => (
            <a key={a.fieldKey} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Paperclip className="h-3 w-3" />
              {a.label}: {a.fileName}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

export function SubmissionList({
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
  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!submissions || submissions.length === 0) return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
  return (
    <div className="flex flex-col gap-3">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  )
}
