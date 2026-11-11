import { format } from 'date-fns'
import { Inbox } from 'lucide-react'
import { AppDialog } from '@/components/app-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { DrilldownDimension, DrilldownRow } from '@/api/dashboard'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/StatusBadge'
import { useDashboardDrilldown } from '@/hooks/useDashboard'
import { humanize } from '@/lib/format'

export type DrilldownSelection = { dimension: DrilldownDimension; value: string } | null

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
          {row.status && <StatusBadge status={row.status} label={humanize(row.status)} />}
          {row.quantity != null && (
            <span className="text-sm font-semibold text-foreground">
              {row.quantity.toLocaleString('en-IN')} {row.quantity === 1 ? 'PEL' : 'PELs'}
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{format(new Date(row.at), 'dd MMM yyyy, h:mm a')}</p>
    </>
  )
  return <div className="rounded-lg border p-3">{content}</div>
}

/** Shown when a chart datapoint (a donut slice, a bar, or a PEL figure) is clicked -- the actual records behind that number. */
export function DashboardDrilldownDialog({ selection, onHide }: { selection: DrilldownSelection; onHide: () => void }) {
  const { data, isLoading } = useDashboardDrilldown(selection)

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
