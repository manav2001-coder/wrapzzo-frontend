import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VendorOrder } from '@/api/vendorOrders'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { vendorOrder } from '../vendor-fixtures'
import { VendorOrderPage } from './VendorOrderPage'

const getVendorOrder = vi.hoisted(() => vi.fn())
const updateVendorOrderStatus = vi.hoisted(() => vi.fn())
const listVendorOrderDesigns = vi.hoisted(() => vi.fn())
const uploadVendorOrderDesign = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getVendorOrder,
  updateVendorOrderStatus,
}))
vi.mock('@/api/vendorOrderDesigns', () => ({ listVendorOrderDesigns, uploadVendorOrderDesign }))

function renderWorkspace(order: VendorOrder) {
  getVendorOrder.mockResolvedValue(order)
  return renderWithProviders(
    <Routes>
      <Route path="/vendor/orders/:id" element={<VendorOrderPage />} />
    </Routes>,
    { route: `/vendor/orders/${order.id}` },
  )
}

describe('VendorOrderPage', () => {
  beforeEach(() => {
    getVendorOrder.mockReset()
    updateVendorOrderStatus.mockReset()
    listVendorOrderDesigns.mockReset().mockResolvedValue([])
    uploadVendorOrderDesign.mockReset()
  })

  it('lays out what to print, how many and where it goes', async () => {
    renderWorkspace(vendorOrder())
    expect(await screen.findByRole('heading', { name: /ORD-101 · Prescription Pad/ })).toBeInTheDocument()
    expect(screen.getAllByText('Reg. no. MH-12345').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shah Heart Clinic').length).toBeGreaterThan(0)
    expect(screen.getByText('Quantity').nextElementSibling).toHaveTextContent('5')
    expect(screen.getAllByText('12 MG Road, Pune').length).toBeGreaterThan(0)
  })

  it('asks for artwork first and keeps dispatch locked until a proof is approved', async () => {
    renderWorkspace(vendorOrder())
    expect(await screen.findByText('Upload an artwork proof for the customer to approve.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as dispatched' })).toBeDisabled()
  })

  it('shows the customer’s feedback on a proof that was sent back', async () => {
    renderWorkspace(vendorOrder({ latestDesignStatus: 'REJECTED', latestDesignComment: 'Registration number is cut off', designVersions: 1 }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration number is cut off')
    expect(screen.getByText('The customer asked for changes. Upload a corrected proof.')).toBeInTheDocument()
  })

  it('uploads a proof and lists the versions', async () => {
    listVendorOrderDesigns.mockResolvedValue([
      {
        id: 'd1',
        orderId: 'o-1',
        versionNo: 1,
        fileUrl: 'https://files.test/v1.pdf',
        fileName: 'v1.pdf',
        status: 'REJECTED',
        uploadedByVendorName: 'Pad Printers',
        reviewedByUserName: 'MR North',
        reviewComment: 'Too small',
        reviewedAt: '2026-10-21T10:00:00Z',
        createdAt: '2026-10-21T09:00:00Z',
      },
    ])
    uploadVendorOrderDesign.mockResolvedValue({})
    const { container } = renderWorkspace(vendorOrder({ latestDesignStatus: 'REJECTED', designVersions: 1 }))
    expect(await screen.findByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText('“Too small”')).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const proof = new File(['%PDF'], 'v2.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [proof] } })
    await waitFor(() => expect(uploadVendorOrderDesign).toHaveBeenCalledWith('o-1', proof))
  })

  it('dispatches a ready order after confirming', async () => {
    const ready = vendorOrder({ artworkApproved: true, latestDesignStatus: 'APPROVED', designVersions: 1 })
    updateVendorOrderStatus.mockResolvedValue({ ...ready, status: 'DISPATCHED' })
    renderWorkspace(ready)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as dispatched' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Mark ORD-101 as dispatched?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as dispatched' }))
    await waitFor(() => expect(updateVendorOrderStatus).toHaveBeenCalledWith('o-1', 'DISPATCHED'))
  })

  it('offers delivery and a way back to production for a dispatched order', async () => {
    renderWorkspace(vendorOrder({ status: 'DISPATCHED', artworkApproved: true }))
    expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Move back to production' })).toBeEnabled()
  })

  it('needs nothing from the vendor once delivered', async () => {
    renderWorkspace(vendorOrder({ status: 'DELIVERED', artworkApproved: true }))
    expect(await screen.findByText('Done. Nothing more to do on this order.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mark as/ })).not.toBeInTheDocument()
  })

  it('says so when the order is not the vendor’s', async () => {
    getVendorOrder.mockRejectedValue(new Error('404'))
    renderWithProviders(
      <Routes>
        <Route path="/vendor/orders/:id" element={<VendorOrderPage />} />
      </Routes>,
      { route: '/vendor/orders/zzz' },
    )
    expect(await screen.findByText("This order isn't in your queue.")).toBeInTheDocument()
  })
})
