import { flexRender, type Row, type Table } from '@tanstack/react-table'

import { columnTitle } from '@/components/data-table/column-order'
import { EXPAND_COLUMN_ID, SELECT_COLUMN_ID } from '@/components/data-table/column-sizing'
import { Skeleton } from '@/components/ui/skeleton'

interface MobileCardsProps<TData> {
  table: Table<TData>
  isLoading: boolean
  pageSize: number
  /** Shown instead of the cards when there are no rows (the empty or error body). */
  emptyBody: React.ReactNode
  renderSubRow?: (row: TData, expanded: boolean) => React.ReactNode
  /** A screen's own compact card for a row, in place of the generic one. */
  renderCard?: (row: TData) => React.ReactNode
  expandedIds: Set<string>
}

/**
 * The phone view of a `DataTable`: one card per row instead of a sideways-scrolling grid, so every
 * field is readable without swiping. The first data column is the card's title, the rest are
 * label/value pairs, and the row's actions (the pinned column) close the card.
 */
export function MobileCards<TData>({ table, isLoading, pageSize, emptyBody, renderSubRow, renderCard, expandedIds }: MobileCardsProps<TData>) {
  if (isLoading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: Math.min(pageSize, 5) }).map((_, index) => (
          <li key={index} className="rounded-xl border border-border p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </li>
        ))}
      </ul>
    )
  }
  const rows = table.getRowModel().rows
  if (!rows.length) return <div className="rounded-xl border border-border p-4">{emptyBody}</div>
  return (
    <ul className={renderCard ? 'space-y-2.5' : 'space-y-3'}>
      {rows.map((row) =>
        renderCard ? (
          <li key={row.id}>{renderCard(row.original)}</li>
        ) : (
        <MobileCard key={row.id} row={row} renderSubRow={renderSubRow} expanded={expandedIds.has(row.id)} />
        ),
      )}
    </ul>
  )
}

function MobileCard<TData>({ row, renderSubRow, expanded }: { row: Row<TData>; renderSubRow?: MobileCardsProps<TData>['renderSubRow']; expanded: boolean }) {
  const cells = row.getVisibleCells()
  const utility = cells.filter((c) => c.column.id === SELECT_COLUMN_ID || c.column.id === EXPAND_COLUMN_ID)
  const actions = cells.filter((c) => c.column.columnDef.meta?.pin === 'right')
  const data = cells.filter((c) => !utility.includes(c) && !actions.includes(c))
  const [title, ...allFields] = data
  const show = (cell: (typeof cells)[number]) => flexRender(cell.column.columnDef.cell, cell.getContext())
  // A column with nothing in it would only show its label above a blank, so it is left out.
  const fields = allFields
    .map((cell) => ({ cell, node: show(cell) }))
    .filter(({ node }) => node !== null && node !== undefined && node !== '' && node !== false)

  return (
    <li data-state={row.getIsSelected() ? 'selected' : undefined} className="rounded-xl border border-border bg-card p-3.5 data-[state=selected]:border-primary/50">
      {/* The title, with the row's actions on the same line (not on a line of their own below): a card is about half as tall. */}
      <div className="flex items-start gap-3">
        {utility.map((cell) => (
          <div key={cell.id} className="shrink-0 pt-0.5">
            {show(cell)}
          </div>
        ))}
        {title && <div className="min-w-0 flex-1 break-words text-left text-sm font-semibold [&_*]:whitespace-normal [&_*]:text-left">{show(title)}</div>}
        {actions.length > 0 && (
          <div className="-my-1.5 -mr-1.5 flex shrink-0 items-center gap-0.5">{actions.map((cell) => <div key={cell.id}>{show(cell)}</div>)}</div>
        )}
      </div>
      {fields.length > 0 && (
        <dl className="mt-2 space-y-1">
          {fields.map(({ cell, node }) => (
            <div key={cell.id} className="flex min-w-0 items-baseline gap-3">
              <dt className="w-24 shrink-0 text-xs text-muted-foreground">{columnTitle(cell.column)}</dt>
              <dd className="min-w-0 flex-1 break-words text-left text-sm [&_*]:justify-start [&_*]:whitespace-normal [&_*]:text-left">{node}</dd>
            </div>
          ))}
        </dl>
      )}
      {expanded && renderSubRow && <div className="mt-3 border-t border-border pt-3">{renderSubRow(row.original, expanded)}</div>}
    </li>
  )
}
