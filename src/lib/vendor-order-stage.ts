import type { OrderStatus } from '@/api/orders'
import type { VendorOrder } from '@/api/vendorOrders'

/**
 * Where an order stands from the vendor's side -- what it needs from them next, which the raw
 * status alone can't say (an order in production may still be waiting on artwork). The backend's
 * dispatch gate (an artwork-required order can't leave before a proof is approved) is the rule
 * this mirrors; this is the reading of it, not the enforcement.
 */
export type VendorStage = 'artwork' | 'rework' | 'review' | 'ready' | 'dispatched' | 'delivered' | 'cancelled'

/** Queue order: what needs the vendor first. */
export const VENDOR_STAGES: VendorStage[] = ['rework', 'artwork', 'review', 'ready', 'dispatched', 'delivered', 'cancelled']

/** Stages where the next move is the vendor's. */
export const ACTION_STAGES: VendorStage[] = ['rework', 'artwork', 'ready', 'dispatched']

type StageInput = Pick<VendorOrder, 'status' | 'artworkRequired' | 'artworkApproved' | 'latestDesignStatus'>

export function vendorStageOf(order: StageInput): VendorStage {
  if (order.status === 'CANCELLED') return 'cancelled'
  if (order.status === 'DELIVERED') return 'delivered'
  if (order.status === 'DISPATCHED') return 'dispatched'
  if (order.artworkRequired && !order.artworkApproved) {
    if (order.latestDesignStatus === 'PENDING_REVIEW') return 'review'
    return order.latestDesignStatus === 'REJECTED' ? 'rework' : 'artwork'
  }
  return 'ready'
}

/** The one forward move the vendor makes from a stage, if it is theirs to make. */
export function nextStatusOf(stage: VendorStage): OrderStatus | null {
  if (stage === 'ready') return 'DISPATCHED'
  if (stage === 'dispatched') return 'DELIVERED'
  return null
}
