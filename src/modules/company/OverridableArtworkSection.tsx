import type { ColumnDef } from '@tanstack/react-table'
import { Eye, FastForward, Palette } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import type { OverridableArtwork } from '@/api/orderDesigns'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { EmptyTable } from '@/components/data-table/empty-table'
import { LabelledField } from '@/components/fields/labelled-field'
import { IconButton } from '@/components/icon-button'
import { ArtworkApprovalTrail } from '@/components/orders/artwork-approval-trail'
import { ArtworkProofPreview } from '@/components/orders/artwork-proof-preview'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useOverrideArtwork } from '@/hooks/useOrderDesigns'
import { formatDate } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import { serverFetcher } from '@/lib/server-list'

/** Proofs still waiting on the MR or a level below the caller: the server works out which of them the caller may approve in place of the people there. */
const fetchOverridable = serverFetcher<OverridableArtwork>('/api/artwork-approvals/overridable/page')

const LIST_FIELDS: ListFieldMap = {
  orderDisplayId: 'text',
  giftName: 'text',
  recipientName: 'text',
  quantity: 'number',
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{children || '-'}</dd>
    </div>
  )
}

/** Where the proof goes once the caller's approval is in: the next level above theirs, or the vendor. */
function whatHappensNext(item: OverridableArtwork) {
  return item.yourLevel < item.approvalLevels
    ? `It then moves to level ${item.yourLevel + 1} of ${item.approvalLevels}.`
    : 'It is then approved and the vendor can print and dispatch.'
}

/**
 * "Waiting below you": proofs that have not yet reached the caller's level of the approval cycle. A person with the Override permission
 * can approve one in place of the people below them -- their approval counts as each skipped step and as their own, and the people
 * skipped are told. Level 1 can cover the MR's review; level 2 also level 1; and so on.
 */
export function OverridableArtworkSection() {
  const showError = useApiErrorToast()
  const override = useOverrideArtwork()
  const [open, setOpen] = useState<OverridableArtwork | null>(null)
  const [confirming, setConfirming] = useState<OverridableArtwork | null>(null)
  const [reason, setReason] = useState('')

  async function confirm() {
    if (!confirming) return
    try {
      const design = await override.mutateAsync({ orderId: confirming.orderId, designId: confirming.designId, comment: reason })
      toast.success('Approved in place of the levels below', {
        description:
          design.status === 'PENDING_FINAL_APPROVAL'
            ? `It moves to level ${design.approvalLevel} of ${design.approvalLevels}${design.waitingOnName ? ` (${design.waitingOnName})` : ''}.`
            : 'The vendor can now print and dispatch.',
      })
      setConfirming(null)
      setReason('')
      setOpen(null)
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<OverridableArtwork, unknown>[]>(
    () => [
      {
        id: 'giftName',
        accessorFn: (item) => item.giftName ?? '',
        header: 'PEL',
        meta: { className: 'min-w-[220px]' },
        cell: ({ row }) => (
          <button type="button" className="flex min-w-0 items-center justify-center gap-2.5" onClick={() => setOpen(row.original)}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Palette className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium hover:underline">{row.original.giftName ?? 'Artwork'}</span>
              <span className="block text-xs text-muted-foreground">{row.original.orderDisplayId}</span>
            </span>
          </button>
        ),
      },
      { id: 'recipientName', accessorFn: (item) => item.recipientName ?? '', header: 'Doctor', meta: { className: 'min-w-[160px]' } },
      { id: 'versionNo', accessorKey: 'versionNo', header: 'Version', enableColumnFilter: false, meta: { className: 'min-w-[80px]' }, cell: ({ row }) => `v${row.original.versionNo}` },
      { id: 'waitingOn', accessorKey: 'waitingOn', header: 'Waiting on', enableColumnFilter: false, meta: { className: 'min-w-[220px]' } },
      {
        id: 'skipping',
        accessorFn: (item) => item.skipping.join(', '),
        header: 'You would skip',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'min-w-[240px]' },
        cell: ({ row }) => row.original.skipping.join(' · '),
      },
      {
        id: 'waitingSince',
        accessorFn: (item) => item.waitingSince ?? '',
        header: 'Waiting since',
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => (row.original.waitingSince ? formatDate(row.original.waitingSince) : '—'),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Eye} label={`Review ${row.original.orderDisplayId}`} onClick={() => setOpen(row.original)} />,
      },
    ],
    [],
  )

  return (
    <>
      <DataTable<OverridableArtwork>
        columns={columns}
        fetchData={fetchOverridable}
        refetchInterval={LIVE_REFRESH_MS}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        defaultSort={{ id: 'waitingSince', desc: false }}
        getRowId={(item) => item.designId}
        tableId="artwork-overridable"
        configNamespace="artwork-overridable"
        emptyState={
          <EmptyTable
            icon={<FastForward className="h-8 w-8 opacity-50" />}
            message="Nothing waiting below you"
            description="Proofs still waiting on the MR or a level below yours appear here."
          />
        }
      />

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b px-6 py-4 pr-10 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <Palette className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{open.giftName ?? 'Artwork'}</SheetTitle>
                    <SheetDescription>
                      {open.orderDisplayId} · waiting on {open.waitingOn}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Doctor">{open.recipientName}</Detail>
                  <Detail label="Quantity">{open.quantity}</Detail>
                  <Detail label="Requested by">{open.requestedByName}</Detail>
                  <Detail label="Waiting since">{open.waitingSince ? formatDate(open.waitingSince) : '—'}</Detail>
                </dl>

                <section className="space-y-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                  <h3 className="font-semibold">If you approve it now</h3>
                  <p className="text-muted-foreground">Your approval counts as your own level and as these, which are skipped:</p>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {open.skipping.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">{whatHappensNext(open)}</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Proof · version {open.versionNo}</h3>
                  <ArtworkProofPreview fileUrl={open.fileUrl} fileName={open.fileName} title={`Version ${open.versionNo} · ${open.orderDisplayId}`} />
                  {open.fileName && <p className="truncate font-mono text-xs text-muted-foreground">{open.fileName}</p>}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Approval trail</h3>
                  <ArtworkApprovalTrail steps={open.approvals} pending={{ level: open.waitingLevel, waitingOnName: open.waitingOn }} />
                </section>
              </div>

              <div className="flex gap-2 border-t px-6 py-4">
                <Button onClick={() => setConfirming(open)}>
                  <FastForward />
                  Approve in place of…
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AppDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) {
            setConfirming(null)
            setReason('')
          }
        }}
        size="sm"
        title="Approve in place of the levels below"
        confirmLabel="Approve and skip"
        cancelLabel="Cancel"
        loading={override.isPending}
        onConfirm={() => void confirm()}
      >
        {confirming && (
          <div className="space-y-3 text-sm">
            <p>
              You are approving {confirming.orderDisplayId} in place of: <strong>{confirming.skipping.join(', ')}</strong>. They will be told. {whatHappensNext(confirming)}
            </p>
            <LabelledField id="override-reason" label="Reason (optional, shown in the approval trail)">
              <Textarea id="override-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </LabelledField>
          </div>
        )}
      </AppDialog>
    </>
  )
}
