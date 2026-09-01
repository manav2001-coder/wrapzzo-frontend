import { format } from 'date-fns'
import { Dialog } from 'primereact/dialog'
import { ProgressSpinner } from 'primereact/progressspinner'
import { StatusBadge } from '@/components/StatusBadge'
import { useQuickGiftRequest } from '@/hooks/useQuickGifts'
import { humanize, parseDateOnly } from '@/lib/format'

/**
 * Read-only Quick Gift detail, opened from the Dashboard's activity feed -- the same
 * `GET /api/quick-gifts/{id}` any Company Admin or Member with quickgift.create can already
 * call for any request in their company (see QuickGiftService.getEntity), so this needs no
 * extra permission check beyond what the feed itself is already gated by. No "request photo
 * link" action here -- that endpoint is requester-only server-side, and this dialog may be
 * opened by someone other than the requester.
 */
export function QuickGiftActivityDialog({ quickGiftId, onHide }: { quickGiftId: string | null; onHide: () => void }) {
  const { data: request, isLoading } = useQuickGiftRequest(quickGiftId ?? undefined)

  return (
    <Dialog
      header={request?.giftName ?? 'Quick Gift request'}
      visible={quickGiftId !== null}
      onHide={onHide}
      style={{ width: '32rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      modal
    >
      {isLoading || !request ? (
        <div className="flex justify-center py-10">
          <ProgressSpinner style={{ width: 32, height: 32 }} strokeWidth="4" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{format(new Date(request.createdAt), 'dd MMM yyyy, h:mm a')}</span>
            <StatusBadge status={request.status} label={humanize(request.status)} />
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Requested by</p>
              <p className="text-text">{request.requestedByName ?? 'a team member'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Recipient</p>
              <p className="text-text">{request.recipientName}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Phone</p>
              <p className="text-text">{request.recipientPhone}</p>
            </div>
            {request.recipientDob && (
              <div>
                <p className="text-xs text-text-muted">Date of birth</p>
                <p className="text-text">{format(parseDateOnly(request.recipientDob), 'dd MMM yyyy')}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-xs text-text-muted">Delivery address</p>
              <p className="text-text">{request.deliveryAddress}</p>
            </div>
            {request.giftMessage && (
              <div className="sm:col-span-2">
                <p className="text-xs text-text-muted">Gift message</p>
                <p className="text-text">{request.giftMessage}</p>
              </div>
            )}
            {request.orderDisplayId && (
              <div>
                <p className="text-xs text-text-muted">Order</p>
                <p className="text-text">{request.orderDisplayId}</p>
              </div>
            )}
          </div>

          {request.rejectionReason && <p className="text-sm text-red-500 dark:text-red-400">Rejected: {request.rejectionReason}</p>}

          {request.photoUrl && (
            <div>
              <p className="mb-2 text-xs text-text-muted">Recipient's photo</p>
              <a href={request.photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                <img src={request.photoUrl} alt={request.photoFileName ?? ''} className="h-32 w-32 rounded-lg border border-border object-cover" />
              </a>
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
