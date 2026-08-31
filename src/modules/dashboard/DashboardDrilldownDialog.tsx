import { format } from 'date-fns'
import { Dialog } from 'primereact/dialog'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Link } from 'react-router-dom'
import type { DrilldownDimension } from '@/api/dashboard'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { useDashboardDrilldown } from '@/hooks/useDashboard'
import { humanize } from '@/lib/format'

export type DrilldownSelection = { dimension: DrilldownDimension; value: string } | null

/** Shown when a chart datapoint (a donut slice or a bar) is clicked -- the actual records behind that number. */
export function DashboardDrilldownDialog({ selection, onHide }: { selection: DrilldownSelection; onHide: () => void }) {
  const { data, isLoading } = useDashboardDrilldown(selection)

  return (
    <Dialog header={data?.title ?? 'Details'} visible={selection !== null} onHide={onHide} style={{ width: '34rem' }}>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <ProgressSpinner style={{ width: 32, height: 32 }} strokeWidth="4" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon="pi-inbox" title="Nothing here yet" description="No records behind this number just yet." />
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {data.rows.map((row, i) => {
            const content = (
              <>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{row.title}</p>
                    <p className="truncate text-xs text-text-muted">
                      {row.displayId ? `${row.displayId} · ` : ''}
                      {row.subtitle}
                    </p>
                  </div>
                  <StatusBadge status={row.status} label={humanize(row.status)} />
                </div>
                <p className="mt-1 text-xs text-text-muted">{format(new Date(row.at), 'dd MMM yyyy, h:mm a')}</p>
              </>
            )
            return row.campaignId ? (
              <Link
                key={i}
                to={`/campaigns/${row.campaignId}`}
                className="rounded-lg border border-border p-3 transition-colors hover:border-accent/50 hover:bg-surface-muted"
              >
                {content}
              </Link>
            ) : (
              <div key={i} className="rounded-lg border border-border p-3">
                {content}
              </div>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}
