import { format } from 'date-fns'
import { AppDialog } from '@/components/app-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { QuickGiftStatusBadge } from '@/modules/quickgift/QuickGiftRequestSheet'
import { useQuickGiftRequest } from '@/hooks/useQuickGifts'
import { parseDateOnly } from '@/lib/format'

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
    <AppDialog
      title={request?.giftName ?? "Quick Gift request"}
      open={quickGiftId !== null}
      size="md"
      cancelLabel="Close"
      onOpenChange={(open) => !open && onHide()}
    >
      {isLoading || !request ? (
        <div className="flex justify-center py-10">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{format(new Date(request.createdAt), 'dd MMM yyyy, h:mm a')}</span>
            <QuickGiftStatusBadge status={request.status} />
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Requested by</p>
              <p className="text-foreground">{request.requestedByName ?? 'a team member'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="text-foreground">{request.recipientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-foreground">{request.recipientPhone}</p>
            </div>
            {request.recipientDob && (
              <div>
                <p className="text-xs text-muted-foreground">Date of birth</p>
                <p className="text-foreground">{format(parseDateOnly(request.recipientDob), 'dd MMM yyyy')}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Delivery address</p>
              <p className="text-foreground">{request.deliveryAddress}</p>
            </div>
            {request.giftMessage && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Gift message</p>
                <p className="text-foreground">{request.giftMessage}</p>
              </div>
            )}
            {request.orderDisplayId && (
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="text-foreground">{request.orderDisplayId}</p>
              </div>
            )}
          </div>

          {request.rejectionReason && <p className="text-sm text-destructive">Rejected: {request.rejectionReason}</p>}

          {request.photoUrl && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Recipient's photo</p>
              <a href={request.photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                <img src={request.photoUrl} alt={request.photoFileName ?? ''} className="h-32 w-32 rounded-lg border object-cover" />
              </a>
            </div>
          )}
        </div>
      )}
    </AppDialog>
  )
}
