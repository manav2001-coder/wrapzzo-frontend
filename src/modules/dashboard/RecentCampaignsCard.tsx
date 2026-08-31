import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { humanize } from '@/lib/format'
import type { RecentCampaign } from '@/api/dashboard'

/** Each campaign as a clickable list row -- an icon, name/meta, status, and deadline -- instead of a raw
 * <table>, so it reads as the same kind of "feed" as Recent activity next to it, not a leftover data grid. */
export function RecentCampaignsCard({ campaigns }: { campaigns: RecentCampaign[] }) {
  const navigate = useNavigate()

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
          <i className="pi pi-megaphone text-sm" />
        </div>
        <p className="text-sm font-semibold text-text">Recent campaigns</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-text-muted">No campaigns yet.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {campaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/campaigns/${c.id}`)}
              className="flex items-center gap-3 rounded-xl border-none bg-transparent p-2.5 text-left transition-colors hover:bg-surface-muted"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-text-muted">
                <i className="pi pi-megaphone text-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{c.name}</p>
                <p className="truncate text-xs text-text-muted">
                  {c.displayId} · {c.ownerName} · {c.fieldCount} field{c.fieldCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={c.status} label={humanize(c.status)} />
                <span className="text-[11px] text-text-muted">
                  {c.submissionDeadline ? format(new Date(c.submissionDeadline), 'dd MMM yyyy') : '—'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
