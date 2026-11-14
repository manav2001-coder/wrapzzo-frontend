import type { OrderStatus } from '@/api/orders'
import type { VendorOrder } from '@/api/vendorOrders'

/**
 * Where an order stands from the vendor's side -- what it needs from them next, which the raw
 * status alone can't say (an order in production may still be waiting on artwork). The backend's
 * dispatch gate (an artwork-required order can't leave before a proof is approved) is the rule
 * this mirrors; this is the reading of it, not the enforcement.
 *
 * The vendor's part -- and the platform's -- ends at 'dispatched'.
 */
export type VendorStage = 'artwork' | 'rework' | 'review' | 'ready' | 'dispatched' | 'cancelled'

/** Queue order: what needs the vendor first. */
export const VENDOR_STAGES: VendorStage[] = ['rework', 'artwork', 'review', 'ready', 'dispatched', 'cancelled']

/** Stages where the next move is the vendor's. */
export const ACTION_STAGES: VendorStage[] = ['rework', 'artwork', 'ready']

type StageInput = Pick<VendorOrder, 'status' | 'artworkRequired' | 'artworkApproved' | 'latestDesignStatus'>

export function vendorStageOf(order: StageInput): VendorStage {
  if (order.status === 'CANCELLED') return 'cancelled'
  if (order.status === 'DISPATCHED') return 'dispatched'
  if (order.artworkRequired && !order.artworkApproved) {
    // Still with the customer while the MR's manager gives the final approval.
    if (order.latestDesignStatus === 'PENDING_REVIEW' || order.latestDesignStatus === 'PENDING_FINAL_APPROVAL') return 'review'
    return order.latestDesignStatus === 'REJECTED' ? 'rework' : 'artwork'
  }
  return 'ready'
}

/** The one forward move the vendor makes from a stage, if it is theirs to make: dispatching. */
export function nextStatusOf(stage: VendorStage): OrderStatus | null {
  return stage === 'ready' ? 'DISPATCHED' : null
}
