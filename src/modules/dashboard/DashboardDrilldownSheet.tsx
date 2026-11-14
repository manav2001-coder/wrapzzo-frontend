import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

/** Records a page: enough to scan, short enough that the drawer never turns into a wall. */
const PAGE_SIZE = 20

/**
 * Shown when a chart datapoint (a donut slice, a bar, or a PEL figure) is clicked -- the actual records behind that number, in a side
 * drawer (the whole screen on a phone), a page at a time with the total and Previous / Next.
 */
export function DashboardDrilldownSheet({ selection, onHide }: { selection: DrilldownSelection; onHide: () => void }) {
  const [page, setPage] = useState(0)
  // A different number was clicked: start again from its first page.
  useEffect(() => setPage(0), [selection?.dimension, selection?.value])
  const { data, isLoading, isFetching } = useDashboardDrilldown(selection, page, PAGE_SIZE)

  const total = data?.total ?? data?.rows.length ?? 0
  const size = data?.pageSize || PAGE_SIZE
  const from = total === 0 ? 0 : page * size + 1
  const to = Math.min((page + 1) * size, total)
  const lastPage = Math.max(Math.ceil(total / size) - 1, 0)

  return (
    <Sheet open={selection !== null} onOpenChange={(open) => !open && onHide()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle>{data?.title ?? 'Details'}</SheetTitle>
          <SheetDescription>
            {isLoading ? 'Loading…' : total === 0 ? 'No records' : `${total.toLocaleString('en-IN')}${data?.capped ? '+' : ''} ${total === 1 ? 'record' : 'records'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-20 w-full" />
              ))}
            </div>
          ) : !data || data.rows.length === 0 ? (
            <EmptyState variant="plain" icon={Inbox} title="Nothing here yet" description="No records behind this number just yet." />
          ) : (
            <div className={isFetching ? 'flex flex-col gap-2 opacity-60 transition-opacity' : 'flex flex-col gap-2 transition-opacity'}>
              {data.rows.map((row, i) => (
                <DrilldownRowItem key={`${page}-${i}`} row={row} />
              ))}
            </div>
          )}
        </div>

        {total > size && (
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              Showing {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
              {data?.capped ? '+' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="Next page" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(p + 1, lastPage))}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
