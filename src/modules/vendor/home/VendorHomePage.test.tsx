import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeVendorApi } from '@/test/fake-vendor-api'
import { renderWithProviders, screen } from '@/test/test-utils'
import { vendorGift, vendorOrder } from '../vendor-fixtures'
import { VendorHomePage } from './VendorHomePage'

const get = vi.hoisted(() => vi.fn())
const getMyVendorProfile = vi.hoisted(() => vi.fn())
const listVendorGifts = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), getMyVendorProfile }))
vi.mock('@/lib/vendorApiClient', async (importOriginal) => ({ ...(await importOriginal<object>()), vendorApiClient: { get } }))
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
    get.mockReset().mockImplementation(fakeVendorApi([
      vendorOrder({ id: 'a', displayId: 'ORD-1' }),
      vendorOrder({ id: 'b', displayId: 'ORD-2', latestDesignStatus: 'REJECTED', latestDesignComment: 'Name misspelt' }),
      vendorOrder({ id: 'c', displayId: 'ORD-3', artworkApproved: true }),
    ]))
  })

  it('greets the vendor and counts the queue by stage', async () => {
    renderHome()
    expect(await screen.findByRole('heading', { level: 1, name: /Good (morning|afternoon|evening), Pad Printers/ })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /1\s*Changes requested/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*Needs artwork/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*Ready to dispatch/ })).toBeInTheDocument()
  })

  it('says how many orders wait on the vendor, with no button in the banner', async () => {
    renderHome()
    expect(await screen.findByText('3 orders are waiting on you')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open the most urgent order' })).not.toBeInTheDocument()
  })

  it('lists the most urgent order first: a proof sent back before a missing one or a ready one', async () => {
    renderHome()
    await screen.findByText('“Name misspelt”')
    const rows = screen.getAllByRole('link', { name: /ORD-/ })
    expect(rows[0]).toHaveTextContent('ORD-2')
  })

  it('lists the orders that need the vendor, with what to do and any customer comment', async () => {
    renderHome()
    expect(await screen.findByText('“Name misspelt”')).toBeInTheDocument()
    expect(screen.getByText('Upload an artwork proof')).toBeInTheDocument()
    expect(screen.getByText('Pack it and mark it dispatched')).toBeInTheDocument()
  })

  it('says so when nothing is waiting', async () => {
    get.mockImplementation(fakeVendorApi([vendorOrder({ id: 'd', status: 'DELIVERED', artworkApproved: true })]))
    renderHome()
    expect(await screen.findAllByText("You're all caught up")).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Open the most urgent order' })).not.toBeInTheDocument()
  })

  it('opens the orders list on the stage a tile stands for', async () => {
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: /1\s*Ready to dispatch/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/orders?stage=ready')
  })

  it('summarises the catalogue, including what Wrappzo has hidden', async () => {
    renderHome()
    expect(await screen.findByText('1 product live in stores')).toBeInTheDocument()
    expect(screen.getByText('1 hidden by Wrappzo')).toBeInTheDocument()
  })
})
