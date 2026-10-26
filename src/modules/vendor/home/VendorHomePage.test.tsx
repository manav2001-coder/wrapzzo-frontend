import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { vendorGift, vendorOrder } from '../vendor-fixtures'
import { VendorHomePage } from './VendorHomePage'

const listVendorOrders = vi.hoisted(() => vi.fn())
const getMyVendorProfile = vi.hoisted(() => vi.fn())
const listVendorGifts = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), listVendorOrders, getMyVendorProfile }))
vi.mock('@/api/vendorGifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listVendorGifts }))

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

function renderHome() {
  return renderWithProviders(
    <Routes>
      <Route path="/vendor" element={<VendorHomePage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/vendor' },
  )
}

describe('VendorHomePage', () => {
  beforeEach(() => {
    getMyVendorProfile.mockReset().mockResolvedValue({ id: 'v-1', name: 'Pad Printers' })
    listVendorGifts.mockReset().mockResolvedValue([vendorGift(), vendorGift({ id: 'g-2', active: false })])
    listVendorOrders.mockReset().mockResolvedValue([
      vendorOrder({ id: 'a', displayId: 'ORD-1' }),
      vendorOrder({ id: 'b', displayId: 'ORD-2', latestDesignStatus: 'REJECTED', latestDesignComment: 'Name misspelt' }),
      vendorOrder({ id: 'c', displayId: 'ORD-3', artworkApproved: true }),
    ])
  })

  it('greets the vendor and counts the queue by stage', async () => {
    renderHome()
    expect(await screen.findByRole('heading', { name: 'Welcome, Pad Printers' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Changes requested\s*1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Needs artwork\s*1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ready to dispatch\s*1/ })).toBeInTheDocument()
  })

  it('lists the proofs customers sent back, with their comment', async () => {
    renderHome()
    expect(await screen.findByText('Changes requested by customers')).toBeInTheDocument()
    expect(screen.getByText('“Name misspelt”')).toBeInTheDocument()
  })

  it('opens the orders list on the stage a tile stands for', async () => {
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: /Ready to dispatch\s*1/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/orders?stage=ready')
  })

  it('summarises the catalogue, including what Wrapzzo has hidden', async () => {
    renderHome()
    expect(await screen.findByText('1 gift live in stores')).toBeInTheDocument()
    expect(screen.getByText('1 hidden by Wrapzzo')).toBeInTheDocument()
  })
})
