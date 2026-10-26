import { describe, expect, it } from 'vitest'

import { nextStatusOf, vendorStageOf } from './vendor-order-stage'

const base = { status: 'PRODUCTION_QUEUE', artworkRequired: true, artworkApproved: false, latestDesignStatus: null } as const

describe('vendorStageOf', () => {
  it('asks for artwork before any proof exists', () => {
    expect(vendorStageOf(base)).toBe('artwork')
  })

  it('is in review while the newest proof waits on the customer', () => {
    expect(vendorStageOf({ ...base, latestDesignStatus: 'PENDING_REVIEW' })).toBe('review')
  })

  it('asks for rework when the newest proof was sent back', () => {
    expect(vendorStageOf({ ...base, latestDesignStatus: 'REJECTED' })).toBe('rework')
  })

  it('is ready once a proof is approved, or when the product needs none', () => {
    expect(vendorStageOf({ ...base, artworkApproved: true, latestDesignStatus: 'APPROVED' })).toBe('ready')
    // A later proof uploaded after an approval doesn't take the approval away.
    expect(vendorStageOf({ ...base, artworkApproved: true, latestDesignStatus: 'PENDING_REVIEW' })).toBe('ready')
    expect(vendorStageOf({ ...base, artworkRequired: false })).toBe('ready')
  })

  it('follows the status once the order has left production', () => {
    expect(vendorStageOf({ ...base, status: 'DISPATCHED' })).toBe('dispatched')
    expect(vendorStageOf({ ...base, status: 'DELIVERED' })).toBe('delivered')
    expect(vendorStageOf({ ...base, status: 'CANCELLED' })).toBe('cancelled')
  })
})

describe('nextStatusOf', () => {
  it('moves forward only where the move is the vendor’s', () => {
    expect(nextStatusOf('ready')).toBe('DISPATCHED')
    expect(nextStatusOf('dispatched')).toBe('DELIVERED')
    expect(nextStatusOf('artwork')).toBeNull()
    expect(nextStatusOf('review')).toBeNull()
    expect(nextStatusOf('delivered')).toBeNull()
  })
})
