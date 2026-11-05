import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, within } from '@/test/test-utils'
import { vendorGift } from '../vendor-fixtures'
import { VendorGiftFormPage } from './VendorGiftFormPage'
import { VendorGiftListPage } from './VendorGiftListPage'

const listVendorGifts = vi.hoisted(() => vi.fn())
const getVendorGift = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorGifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listVendorGifts, getVendorGift }))

describe('VendorGiftListPage', () => {
  beforeEach(() => {
    listVendorGifts.mockReset().mockResolvedValue([
      vendorGift({ id: 'g-1', name: 'Prescription Pad' }),
      vendorGift({ id: 'g-2', name: 'Desk Calendar', active: false }),
    ])
  })

  it('lists the vendor’s products with their price, needs and whether they are live', async () => {
    renderWithProviders(<VendorGiftListPage />, { route: '/vendor/gifts' })
    const pad = (await screen.findByRole('link', { name: 'Prescription Pad' })).closest('tr')!
    expect(within(pad).getByText('Live')).toBeInTheDocument()
    // Artwork approval is always part of the flow, so it is not listed as a per-product need.
    expect(within(pad).queryByText('Needs artwork')).not.toBeInTheDocument()

    const calendar = screen.getByRole('link', { name: 'Desk Calendar' }).closest('tr')!
    expect(within(calendar).getByText('Hidden')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add product/ })).toBeInTheDocument()
  })
})

describe('VendorGiftFormPage', () => {
  beforeEach(() => {
    listVendorGifts.mockReset().mockResolvedValue([])
    getVendorGift.mockReset()
  })

  it('keeps Wrappzo’s fees off the vendor’s form', async () => {
    getVendorGift.mockResolvedValue(vendorGift())
    renderWithProviders(
      <Routes>
        <Route path="/vendor/gifts/:id" element={<VendorGiftFormPage />} />
      </Routes>,
      { route: '/vendor/gifts/g-1' },
    )
    expect(await screen.findByRole('heading', { name: 'Prescription Pad' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Base price/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Markup fee/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Commission fee/)).not.toBeInTheDocument()
  })

  it('offers the vendor no flags: artwork approval is always on, and the recipient photo is Wrappzo’s call', async () => {
    getVendorGift.mockResolvedValue(vendorGift())
    renderWithProviders(
      <Routes>
        <Route path="/vendor/gifts/:id" element={<VendorGiftFormPage />} />
      </Routes>,
      { route: '/vendor/gifts/g-1' },
    )
    expect(await screen.findByRole('heading', { name: 'Prescription Pad' })).toBeInTheDocument()
    expect(screen.queryByText(/Needs artwork approval/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Needs a recipient photo/)).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('tells the vendor when Wrappzo has hidden a product', async () => {
    getVendorGift.mockResolvedValue(vendorGift({ active: false }))
    renderWithProviders(
      <Routes>
        <Route path="/vendor/gifts/:id" element={<VendorGiftFormPage />} />
      </Routes>,
      { route: '/vendor/gifts/g-1' },
    )
    expect(await screen.findByText(/Hidden from stores by Wrappzo/)).toBeInTheDocument()
  })
})
