import type { ColumnDef } from '@tanstack/react-table'
import { Check, Eye, Palette, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import type { PendingArtworkApproval } from '@/api/orderDesigns'
import { AppDialog } from '@/components/app-dialog'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { LabelledField } from '@/components/fields/labelled-field'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { ArtworkApprovalTrail } from '@/components/orders/artwork-approval-trail'
import { ArtworkProofPreview } from '@/components/orders/artwork-proof-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMenuLabel } from '@/hooks/use-menu-labels'
import { useHasAccess } from '@/hooks/use-permission'
import { usePendingArtworkApprovals, useReviewArtwork } from '@/hooks/useOrderDesigns'
import { formatDate, formatDateTime } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { P } from '@/lib/permissions'
import { OrderRequestsSection } from './OrderRequestsSection'

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

/** Where the proof stands: which level it waits on, and whose it is. */
function levelLabel(item: PendingArtworkApproval) {
  return `Level ${item.approvalLevel} of ${item.approvalLevels}`
}

/**
 * Approvals are artwork only: the MR-approved proofs whose current level waits on this user (or that
 * they can cover with Final Artwork Approval). A table like the rest of the app; a row opens a drawer
 * with the proof, its approval trail and the decision.
 */
export function ApprovalQueuePage() {
  const showError = useApiErrorToast()
  const pageTitle = useMenuLabel('approvals', 'Approvals')
  const canReview = useHasAccess([P.APPROVAL_DECIDE, P.ARTWORK_FINAL_APPROVE])
  const { data: artwork, isLoading, error, refetch } = usePendingArtworkApprovals(canReview)
  const reviewArtwork = useReviewArtwork()

  const [openId, setOpenId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<PendingArtworkApproval | null>(null)
  const [reason, setReason] = useState('')
  // Kept by id so the drawer follows the list as it refreshes (and closes once the proof is decided).
  const open = artwork?.find((item) => item.designId === openId) ?? null

  async function approve(item: PendingArtworkApproval) {
    try {
      const design = await reviewArtwork.mutateAsync({ orderId: item.orderId, designId: item.designId })
      if (design.status === 'PENDING_FINAL_APPROVAL') {
        toast.success('Artwork approved', {
          description: `It moves to level ${design.approvalLevel} of ${design.approvalLevels}${design.waitingOnName ? ` (${design.waitingOnName})` : ''}.`,
        })
      } else {
        toast.success('Artwork approved', { description: 'The vendor can now print and dispatch.' })
      }
      setOpenId(null)
    } catch (err) {
      showError(err)
    }
  }

  async function sendBack() {
    if (!rejecting || !reason.trim()) return
    try {
      await reviewArtwork.mutateAsync({ orderId: rejecting.orderId, designId: rejecting.designId, comment: reason.trim() })
      toast.success('Sent back to the vendor')
      setRejecting(null)
      setReason('')
      setOpenId(null)
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<PendingArtworkApproval, unknown>[]>(
    () => [
      {
        id: 'giftName',
        accessorFn: (item) => item.giftName ?? '',
        header: 'Gift',
        meta: { className: 'min-w-[220px]' },
        cell: ({ row }) => (
          <button type="button" className="flex min-w-0 items-center justify-center gap-2.5" onClick={() => setOpenId(row.original.designId)}>
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
      { id: 'quantity', accessorKey: 'quantity', header: 'Quantity', enableColumnFilter: false, meta: { className: 'min-w-[80px]' } },
      {
        id: 'versionNo',
        accessorKey: 'versionNo',
        header: 'Version',
        enableColumnFilter: false,
        meta: { className: 'min-w-[80px]' },
        cell: ({ row }) => `v${row.original.versionNo}`,
      },
      {
        id: 'level',
        accessorFn: (item) => item.approvalLevel,
        header: 'Waiting on',
        enableColumnFilter: false,
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="whitespace-nowrap">{levelLabel(row.original)}</span>
            {row.original.covering && <Badge variant="warning-soft">Covering</Badge>}
          </span>
        ),
      },
      {
        id: 'mrApprovedAt',
        accessorFn: (item) => item.mrApprovedAt ?? '',
        header: 'MR approved',
        enableColumnFilter: false,
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => (row.original.mrApprovedAt ? formatDate(row.original.mrApprovedAt) : '—'),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => <IconButton icon={Eye} label={`Review ${row.original.orderDisplayId}`} onClick={() => setOpenId(row.original.designId)} />,
      },
    ],
    [],
  )

  return (
    <div>
      <MasterPageHeader title={pageTitle} description="Orders and artwork proofs from your team, waiting on your approval." />

      <OrderRequestsSection />

      <DataTable<PendingArtworkApproval>
        columns={columns}
        data={artwork ?? []}
        isLoading={isLoading}
        listFields={LIST_FIELDS}
        searchable
        showRowSelectionColumn={false}
        defaultSort={{ id: 'mrApprovedAt', desc: true }}
        getRowId={(item) => item.designId}
        tableId="artwork-approvals"
        configNamespace="artwork-approvals"
        emptyState={listEmptyBody({
          error,
          onRetry: () => void refetch(),
          icon: <Palette className="h-8 w-8 opacity-50" />,
          message: 'No artwork waiting for your approval',
          description: "You're all caught up. New proofs appear here.",
        })}
      />

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpenId(null)}>
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
                      {open.orderDisplayId} · {levelLabel(open)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Doctor">{open.recipientName}</Detail>
                  <Detail label="Quantity">{open.quantity}</Detail>
                  <Detail label="Requested by">{open.requestedByName}</Detail>
                  <Detail label="MR approved by">{open.mrApprovedByName}</Detail>
                  <Detail label="MR approved on">{open.mrApprovedAt ? formatDateTime(open.mrApprovedAt) : '—'}</Detail>
                  <Detail label="Waiting on">{open.waitingOnName ?? 'No manager above the MR'}</Detail>
                </dl>

                {open.covering && (
                  <Badge variant="warning-soft">
                    {open.waitingOnName ? `Covering for ${open.waitingOnName}` : 'No manager above the MR: you sign as Final Artwork Approval'}
                  </Badge>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Proof · version {open.versionNo}</h3>
                  <ArtworkProofPreview fileUrl={open.fileUrl} fileName={open.fileName} title={`Version ${open.versionNo} · ${open.orderDisplayId}`} />
                  {open.fileName && <p className="truncate font-mono text-xs text-muted-foreground">{open.fileName}</p>}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Approval trail</h3>
                  <ArtworkApprovalTrail steps={open.approvals} pending={{ level: open.approvalLevel, waitingOnName: open.waitingOnName }} />
                </section>
              </div>

              <div className="flex gap-2 border-t px-6 py-4">
                <Button loading={reviewArtwork.isPending} onClick={() => void approve(open)}>
                  <Check />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setRejecting(open)}>
                  <X />
                  Request changes
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AppDialog
        open={rejecting !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRejecting(null)
            setReason('')
          }
        }}
        size="sm"
        title="Send artwork back to the vendor"
        confirmLabel="Send back to vendor"
        confirmVariant="destructive"
        cancelLabel="Cancel"
        confirmDisabled={!reason.trim()}
        loading={reviewArtwork.isPending}
        onConfirm={() => void sendBack()}
      >
        <LabelledField id="reject-reason" label="What should change? (shown to the vendor)">
          <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </LabelledField>
      </AppDialog>
    </div>
  )
}
