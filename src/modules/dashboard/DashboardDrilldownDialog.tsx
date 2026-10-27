import { format } from 'date-fns'
import { Inbox } from 'lucide-react'
import { AppDialog } from '@/components/app-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import type { DrilldownDimension, DrilldownRow } from '@/api/dashboard'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/StatusBadge'
import { useDashboardDrilldown } from '@/hooks/useDashboard'
import { formatCurrency, humanize } from '@/lib/format'

export type DrilldownSelection = { dimension: DrilldownDimension; value: string } | null

const SOURCE_ORDER = ['CAMPAIGN', 'QUICK_GIFT', 'BULK_GIFT']
const SOURCE_LABELS: Record<string, string> = {
  CAMPAIGN: 'Campaign orders',
  QUICK_GIFT: 'Quick Gift orders',
  BULK_GIFT: 'Bulk Gifting orders',
}

function DrilldownRowItem({ row }: { row: DrilldownRow }) {
  const content = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.displayId ? `${row.displayId} · ` : ''}
            {row.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={row.status} label={humanize(row.status)} />
          {row.amount != null && <span className="text-sm font-semibold text-foreground">{formatCurrency(row.amount)}</span>}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{format(new Date(row.at), 'dd MMM yyyy, h:mm a')}</p>
    </>
  )
  return row.campaignId ? (
    <Link
      to={`/campaigns/${row.campaignId}`}
      className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-lg border p-3">{content}</div>
  )
}

/** Shown when a chart datapoint (a donut slice, a bar, or the Monthly Spend hero) is clicked -- the actual records behind that number.
 * Monthly Spend specifically segregates Campaign orders from Quick Gift orders, each with its own subtotal, rather than one mixed list. */
export function DashboardDrilldownDialog({ selection, onHide }: { selection: DrilldownSelection; onHide: () => void }) {
  const { data, isLoading } = useDashboardDrilldown(selection)

  const groups =
    selection?.dimension === 'monthlySpend' && data
      ? SOURCE_ORDER.map((source) => ({ source, rows: data.rows.filter((row) => row.source === source) })).filter(
          (group) => group.rows.length > 0,
        )
      : null

  return (
    <AppDialog
      title={data?.title ?? "Details"}
      open={selection !== null}
      size="md"
      cancelLabel="Close"
      onOpenChange={(open) => !open && onHide()}
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState variant="plain" icon={Inbox} title="Nothing here yet" description="No records behind this number just yet." />
      ) : groups ? (
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
          {groups.map((group) => {
            const subtotal = group.rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
            return (
              <div key={group.source}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {SOURCE_LABELS[group.source] ?? humanize(group.source)} ({group.rows.length})
                  </p>
                  <p className="text-xs font-semibold text-foreground">{formatCurrency(subtotal)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {group.rows.map((row, i) => (
                    <DrilldownRowItem key={i} row={row} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {data.rows.map((row, i) => (
            <DrilldownRowItem key={i} row={row} />
          ))}
        </div>
      )}
    </AppDialog>
  )
}
