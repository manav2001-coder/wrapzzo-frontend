import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VendorOrder } from '@/api/vendorOrders'
import { renderWithProviders, screen } from '@/test/test-utils'
import { vendorOrder } from '../vendor-fixtures'
import { VendorOrderPage } from './VendorOrderPage'

vi.mock('@/hooks/use-is-mobile', () => ({ useIsMobile: () => true }))
const getVendorOrder = vi.hoisted(() => vi.fn())
const updateVendorOrderStatus = vi.hoisted(() => vi.fn())
const listVendorOrderDesigns = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), getVendorOrder, updateVendorOrderStatus }))
vi.mock('@/api/vendorOrderDesigns', () => ({ listVendorOrderDesigns, uploadVendorOrderDesign: vi.fn() }))

function renderWorkspace(order: VendorOrder) {
  getVendorOrder.mockResolvedValue(order)
  return renderWithProviders(
    <Routes>
      <Route path="/vendor/orders/:id" element={<VendorOrderPage />} />
    </Routes>,
    { route: `/vendor/orders/${order.id}` },
  )
}

describe('VendorOrderPage on a phone', () => {
  beforeEach(() => {
    getVendorOrder.mockReset()
    updateVendorOrderStatus.mockReset().mockResolvedValue(vendorOrder({ status: 'DISPATCHED' }))
    listVendorOrderDesigns.mockReset().mockResolvedValue([])
  })

  it('keeps the main action in one bar at the bottom of the screen, once, and asks before dispatching', async () => {
    renderWorkspace(vendorOrder({ artworkApproved: true, latestDesignStatus: 'APPROVED' }))
    const dispatch = await screen.findByRole('button', { name: 'Mark as dispatched' })
    // Not repeated higher up the page.
    expect(screen.getAllByRole('button', { name: 'Mark as dispatched' })).toHaveLength(1)
    expect(dispatch.closest('div')).toHaveClass('fixed')

    await userEvent.click(dispatch)
    expect(await screen.findByRole('dialog')).toHaveTextContent('Mark ORD-101 as dispatched?')
  })

  it('says why dispatch is locked, beside the locked button', async () => {
    renderWorkspace(vendorOrder())
    const dispatch = await screen.findByRole('button', { name: 'Mark as dispatched' })
    expect(dispatch).toBeDisabled()
    expect(dispatch.parentElement).toHaveTextContent('Waiting for the customer to approve the artwork')
  })

  it('asks the vendor to tap, not drop, an artwork proof', async () => {
    renderWorkspace(vendorOrder())
    expect(await screen.findByText(/Tap to choose the proof/)).toBeInTheDocument()
    expect(screen.queryByText(/Drop a proof here/)).not.toBeInTheDocument()
  })

  it('has no action bar once the order is dispatched', async () => {
    renderWorkspace(vendorOrder({ status: 'DISPATCHED', artworkApproved: true }))
    await screen.findByText('Dispatched. Nothing more to do on this order.')
    expect(screen.queryByRole('button', { name: 'Mark as dispatched' })).not.toBeInTheDocument()
  })
})
