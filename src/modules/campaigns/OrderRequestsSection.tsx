import { Check, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import type { PendingOrderApproval } from '@/api/orderApprovals'
import { AppDialog } from '@/components/app-dialog'
import { LabelledField } from '@/components/fields/labelled-field'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useDecideOrder, usePendingOrderApprovals } from '@/hooks/useOrderApprovals'
import { formatCurrency } from '@/lib/format'
import { formatDateTime } from '@/lib/datetime'
import { P } from '@/lib/permissions'

/**
 * Orders from the user's team that wait for their yes before they go to production. Shown only while there are any:
 * an approver with nothing waiting sees just the artwork queue below it. The vendor is never named here.
 */
export function OrderRequestsSection() {
  const showError = useApiErrorToast()
  const canDecide = useHasAccess([P.APPROVAL_DECIDE, P.ARTWORK_FINAL_APPROVE])
  const { data: orders } = usePendingOrderApprovals()
  const decide = useDecideOrder()
  const [declining, setDeclining] = useState<PendingOrderApproval | null>(null)
  const [reason, setReason] = useState('')

  if (!orders || orders.length === 0) return null

  async function approve(order: PendingOrderApproval) {
    try {
      await decide.mutateAsync({ orderId: order.orderId, approve: true })
      toast.success(`${order.displayId} approved`, { description: 'It now goes to production.' })
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
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section aria-label="Orders waiting for your approval" className="mb-6 space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Orders waiting for your approval</h2>
        <p className="text-xs text-muted-foreground">They go to production only once you approve them.</p>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
        {orders.map((order) => (
          <li key={order.orderId} className="flex flex-wrap items-center gap-4 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 basis-64">
              <p className="truncate text-sm font-semibold">
                {order.displayId} · {order.giftName ?? 'Gift'} × {order.quantity}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                For {order.recipientName}
                {order.recipientPcode ? ` (${order.recipientPcode})` : ''} · by {order.requestedByName}
                {order.orgUnitName ? ` · ${order.orgUnitName}` : ''} · {formatDateTime(order.requestedAt)}
                {order.totalPrice != null ? ` · ${formatCurrency(order.totalPrice)}` : ''}
              </p>
              {(order.giftMessage || order.internalNotes) && (
                <p className="mt-1 truncate text-xs text-muted-foreground">“{order.giftMessage ?? order.internalNotes}”</p>
              )}
            </div>
            {canDecide && (
              <div className="flex gap-2">
                <Button size="sm" loading={decide.isPending && decide.variables?.orderId === order.orderId} onClick={() => void approve(order)}>
                  <Check />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeclining(order)}>
                  <X />
                  Decline
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

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
    </section>
  )
}
