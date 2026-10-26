import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, within } from '@/test/test-utils'
import { vendorOrder } from '../vendor-fixtures'
import { VendorOrdersPage } from './VendorOrdersPage'

const listVendorOrders = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), listVendorOrders }))

const ORDERS = [
  vendorOrder({ id: 'a', displayId: 'ORD-1' }),
  vendorOrder({ id: 'b', displayId: 'ORD-2', latestDesignStatus: 'REJECTED', designVersions: 1, latestDesignComment: 'Name misspelt' }),
  vendorOrder({ id: 'c', displayId: 'ORD-3', latestDesignStatus: 'PENDING_REVIEW', designVersions: 2 }),
  vendorOrder({ id: 'd', displayId: 'ORD-4', artworkApproved: true, latestDesignStatus: 'APPROVED', designVersions: 1 }),
  vendorOrder({ id: 'e', displayId: 'ORD-5', status: 'DISPATCHED', artworkApproved: true }),
]

function renderQueue(route = '/vendor/orders') {
  return renderWithProviders(
    <Routes>
      <Route path="/vendor/orders" element={<VendorOrdersPage />} />
      <Route path="/vendor/orders/:id" element={<h1>Order workspace</h1>} />
    </Routes>,
    { route },
  )
}

const orderIds = () => screen.getAllByRole('link', { name: /^ORD-\d$/ }).map((link) => link.textContent)

describe('VendorOrdersPage', () => {
  beforeEach(() => listVendorOrders.mockReset().mockResolvedValue(ORDERS))

  it('lists every order with what it needs next', async () => {
    renderQueue()
    const row = (await screen.findByRole('link', { name: 'ORD-2' })).closest('tr')!
    expect(within(row).getByText('Changes requested')).toBeInTheDocument()
    expect(orderIds()).toHaveLength(5)
  })

  it('tabs the queue by stage, with counts, and opens one from the URL', async () => {
    renderQueue('/vendor/orders?stage=review')
    await screen.findByRole('link', { name: 'ORD-3' })
    expect(orderIds()).toEqual(['ORD-3'])

    await userEvent.click(screen.getByRole('tab', { name: /Ready to dispatch/ }))
    expect(orderIds()).toEqual(['ORD-4'])
    await userEvent.click(screen.getByRole('tab', { name: /Changes requested/ }))
    expect(orderIds()).toEqual(['ORD-2'])
  })

  it('opens the order workspace', async () => {
    renderQueue()
    await userEvent.click(await screen.findByRole('link', { name: 'ORD-1' }))
    expect(screen.getByRole('heading', { name: 'Order workspace' })).toBeInTheDocument()
  })
})
