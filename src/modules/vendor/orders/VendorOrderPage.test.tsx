import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VendorOrder } from '@/api/vendorOrders'
import { ApiError } from '@/lib/axiosClient'
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
    expect(screen.getAllByText('Pcode P-1001').length).toBeGreaterThan(0)
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
    // A pick is only a pick: nothing is sent until the vendor has looked at it and confirmed.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Upload this proof?')).toBeInTheDocument()
    expect(within(dialog).getByText('v2.pdf')).toBeInTheDocument()
    expect(uploadVendorOrderDesign).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Upload proof' }))
    await waitFor(() => expect(uploadVendorOrderDesign).toHaveBeenCalledWith('o-1', proof))
  })

  it('tells the vendor how to name the proof, before they pick one', async () => {
    renderWorkspace(vendorOrder())
    expect(await screen.findByText(/Name the file PCode_DoctorName_AMName\.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/SAP code can be used in place of the AM's name/)).toBeInTheDocument()
  })

  it('nudges the vendor to upload the correct file when the name is refused, and clears the nudge on the next pick', async () => {
    uploadVendorOrderDesign.mockRejectedValue(
      new ApiError('"final.pdf" is not named the way this order needs. Name the proof PCode_DoctorName_AMName.pdf -- for this order: P-1001_Asha-Shah_MR-North.pdf -- then upload it again.', 400),
    )
    const { container } = renderWorkspace(vendorOrder())
    await screen.findByText('Upload an artwork proof for the customer to approve.')

    const wrong = new File(['%PDF'], 'final.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [wrong] } })
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Upload proof' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This file was not uploaded')
    expect(alert).toHaveTextContent('for this order: P-1001_Asha-Shah_MR-North.pdf')
    // It stays on the page (not a toast that vanishes) until another file is picked.
    const better = new File(['%PDF'], 'P-1001_Asha-Shah_MR-North.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [better] } })
    await waitFor(() => expect(screen.queryByText('This file was not uploaded')).not.toBeInTheDocument())
  })

  it('shows a picked PDF for confirmation and sends nothing when the vendor chooses another', async () => {
    const { container } = renderWorkspace(vendorOrder())
    await screen.findByText('Upload an artwork proof for the customer to approve.')

    const wrong = new File(['x'], 'wrong-proof.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [wrong] } })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('PDF proof (no preview)')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Choose another' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(uploadVendorOrderDesign).not.toHaveBeenCalled()
  })

  it('turns away a PDF over 5 MB and says how big it is', async () => {
    const { container } = renderWorkspace(vendorOrder())
    await screen.findByText('Upload an artwork proof for the customer to approve.')

    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [big] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('"huge.pdf" is 6.0 MB. A proof can be at most 5 MB')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(uploadVendorOrderDesign).not.toHaveBeenCalled()
  })

  it('turns an image away: proofs are PDFs only', async () => {
    const { container } = renderWorkspace(vendorOrder())
    await screen.findByText('Upload an artwork proof for the customer to approve.')

    const image = new File(['x'], 'logo.png', { type: 'image/png' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [image] } })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(uploadVendorOrderDesign).not.toHaveBeenCalled()
    // ...and says so, rather than the pick silently vanishing.
    expect(await screen.findByRole('alert')).toHaveTextContent('"logo.png" is not a PDF. Proofs must be PDF files.')
  })

  it('shows a small preview of each version in the artwork history', async () => {
    const version = (id: string, n: number, fileName: string) => ({
      id,
      orderId: 'o-1',
      versionNo: n,
      fileUrl: `https://files.test/${fileName}`,
      fileName,
      status: 'APPROVED',
      reviewedByUserName: null,
      reviewComment: null,
      reviewedAt: null,
      createdAt: '2026-10-21T09:00:00Z',
    })
    listVendorOrderDesigns.mockResolvedValue([version('d2', 2, 'proof-v2.png'), version('d1', 1, 'proof-v1.pdf')])
    const { container } = renderWorkspace(vendorOrder({ artworkApproved: true, latestDesignStatus: 'APPROVED', designVersions: 2 }))

    await screen.findByText('Version 2')
    expect(container.querySelector('img[src="https://files.test/proof-v2.png"]')).not.toBeNull()
    expect(container.querySelector('img[src="https://files.test/proof-v1.pdf"]')).toBeNull()
  })

  it('offers the parcel label only once the order may be packed', async () => {
    const first = renderWorkspace(vendorOrder())
    await screen.findByText('Upload an artwork proof for the customer to approve.')
    expect(screen.queryByRole('button', { name: 'Download label' })).not.toBeInTheDocument()
    first.unmount()

    renderWorkspace(vendorOrder({ artworkApproved: true, latestDesignStatus: 'APPROVED', designVersions: 1 }))
    expect(await screen.findByRole('button', { name: 'Download label' })).toBeEnabled()
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

  it('shows every recipient photo with the name it downloads as', async () => {
    renderWorkspace(
      vendorOrder({
        recipientPhotoUrl: 'https://files.test/a.png',
        recipientPhotos: [
          { url: 'https://files.test/a.png', fileName: 'P-1001_AM07_photo.png' },
          { url: 'https://files.test/b.png', fileName: 'P-1001_AM07_photo_2.png' },
        ],
      }),
    )
    expect(await screen.findByText('P-1001_AM07_photo.png')).toBeInTheDocument()
    expect(screen.getByText('P-1001_AM07_photo_2.png')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'P-1001_AM07_photo_2.png' })).toHaveAttribute('src', 'https://files.test/b.png')
  })
})
