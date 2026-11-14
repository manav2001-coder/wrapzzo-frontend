import type { ColumnDef } from '@tanstack/react-table'
import { Check, Eye, ShoppingBag, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import type { PendingOrderApproval } from '@/api/orderApprovals'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { EmptyTable } from '@/components/data-table/empty-table'
import { LabelledField } from '@/components/fields/labelled-field'
import { IconButton } from '@/components/icon-button'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useDecideOrder } from '@/hooks/useOrderApprovals'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import { serverFetcher } from '@/lib/server-list'
import { formatDate, formatDateTime } from '@/lib/datetime'
import { formatCurrency } from '@/lib/format'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { doctorLabel } from '@/lib/doctor-label'

/** The order queue: a page at a time from the server, which works out which orders are the caller's to decide. */
const fetchOrderRequests = serverFetcher<PendingOrderApproval>('/api/order-approvals/pending/page')

const LIST_FIELDS: ListFieldMap = {
  displayId: 'text',
  giftName: 'text',
  recipientName: 'text',
  quantity: 'number',
  requestedByName: 'text',
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{children || '-'}</dd>
    </div>
  )
}

/**
 * Orders from the user's team that wait for their yes before they go to production: a table like the artwork one, and
 * a row opens a drawer with the details and the decision. The vendor is never named here.
 */
export function OrderRequestsSection() {
  const showError = useApiErrorToast()
  const canDecide = useHasAccess([P.APPROVAL_DECIDE, P.ARTWORK_FINAL_APPROVE])
  const decide = useDecideOrder()

  // The row that was clicked; the drawer shows it and closes once the order is decided.
  const [open, setOpen] = useState<PendingOrderApproval | null>(null)
  const [declining, setDeclining] = useState<PendingOrderApproval | null>(null)
  const [reason, setReason] = useState('')

  async function approve(order: PendingOrderApproval) {
    try {
      await decide.mutateAsync({ orderId: order.orderId, approve: true })
      toast.success(`${order.displayId} approved`, { description: 'It now goes to production.' })
      setOpen(null)
    } catch (err) {
      showError(err)
    }
  }

  async function decline() {
    if (!declining || !reason.trim()) return
    try {
      await decide.mutateAsync({ orderId: declining.orderId, comment: reason.trim(), approve: false })
      toast.success(`${declining.displayId} declined`, { description: `${declining.requestedByName} will see your note.` })
      setDeclining(null)
      setReason('')
      setOpen(null)
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<PendingOrderApproval, unknown>[]>(
    () => [
      {
        id: 'giftName',
        accessorFn: (order) => order.giftName ?? '',
        header: 'PEL',
        meta: { className: 'min-w-[220px]' },
        cell: ({ row }) => (
          <button type="button" className="flex min-w-0 items-center justify-center gap-2.5" onClick={() => setOpen(row.original)}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium hover:underline">{row.original.giftName ?? 'PEL'}</span>
              <span className="block text-xs text-muted-foreground">{row.original.displayId}</span>
            </span>
          </button>
        ),
      },
      { id: 'recipientName', accessorFn: (order) => doctorLabel(order.recipientName, order.recipientPcode), header: 'Doctor', meta: { className: 'min-w-[160px]' } },
      { id: 'quantity', accessorKey: 'quantity', header: 'Quantity', enableColumnFilter: false, meta: { className: 'min-w-[80px]' } },
      { id: 'requestedByName', accessorKey: 'requestedByName', header: 'Requested by', meta: { className: 'min-w-[160px]' } },
      {
        id: 'requestedAt',
        accessorKey: 'requestedAt',
        header: 'Requested',
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => formatDate(row.original.requestedAt),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Eye} label={`Review ${row.original.displayId}`} onClick={() => setOpen(row.original)} />,
      },
    ],
    [],
  )

  return (
    <div>
      <DataTable<PendingOrderApproval>
        columns={columns}
        fetchData={fetchOrderRequests}
        refetchInterval={LIVE_REFRESH_MS}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        defaultSort={{ id: 'requestedAt', desc: false }}
        getRowId={(order) => order.orderId}
        tableId="order-approvals"
        configNamespace="order-approvals"
        emptyState={<EmptyTable icon={<ShoppingBag className="h-8 w-8 opacity-50" />} message="No orders waiting for your approval" description="You're all caught up. New order requests appear here." />}
      />

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b px-6 py-4 pr-10 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{open.giftName ?? 'PEL'}</SheetTitle>
                    <SheetDescription>{open.displayId} · waiting for your approval</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Doctor">{doctorLabel(open.recipientName, open.recipientPcode)}</Detail>
                  <Detail label="Doctor code">{open.recipientPcode}</Detail>
                  <Detail label="Quantity">{open.quantity}</Detail>
                  <Detail label="Total">{open.totalPrice != null ? formatCurrency(open.totalPrice) : null}</Detail>
                  <Detail label="Requested by">{open.requestedByName}</Detail>
                  <Detail label="Org unit">{open.orgUnitName}</Detail>
                  <Detail label="Requested on">{formatDateTime(open.requestedAt)}</Detail>
                </dl>

                {open.giftMessage && (
                  <section className="space-y-1">
                    <h3 className="text-sm font-semibold">Note for the vendor</h3>
                    <p className="text-sm text-muted-foreground">{open.giftMessage}</p>
                  </section>
                )}
                {open.internalNotes && (
                  <section className="space-y-1">
                    <h3 className="text-sm font-semibold">Internal notes</h3>
                    <p className="text-sm text-muted-foreground">{open.internalNotes}</p>
                  </section>
                )}
                <p className="text-xs text-muted-foreground">The order goes to production only once you approve it. If you decline, it is cancelled and {open.requestedByName} sees your note.</p>
              </div>

              {canDecide && (
                <div className="flex gap-2 border-t px-6 py-4">
                  <Button loading={decide.isPending} onClick={() => void approve(open)}>
                    <Check />
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => setDeclining(open)}>
                    <X />
                    Decline
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AppDialog
        open={declining !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeclining(null)
            setReason('')
          }
        }}
        size="sm"
        title={`Decline ${declining?.displayId ?? 'order'}`}
        confirmLabel="Decline order"
        confirmVariant="destructive"
        cancelLabel="Cancel"
        confirmDisabled={!reason.trim()}
        loading={decide.isPending}
        onConfirm={() => void decline()}
      >
        <LabelledField id="decline-reason" label="Why? (shown to the person who placed it; the order is cancelled)">
          <Textarea id="decline-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </LabelledField>
      </AppDialog>
    </div>
  )
}
