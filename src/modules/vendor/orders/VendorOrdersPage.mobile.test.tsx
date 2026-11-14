import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeVendorApi } from '@/test/fake-vendor-api'
import { renderWithProviders, screen, within } from '@/test/test-utils'
import { vendorOrder } from '../vendor-fixtures'
import { VendorOrdersPage } from './VendorOrdersPage'

// A phone: the table becomes cards, and the stage tabs become a row of pills.
vi.mock('@/hooks/use-is-mobile', () => ({ useIsMobile: () => true }))
const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/vendorApiClient', async (importOriginal) => ({ ...(await importOriginal<object>()), vendorApiClient: { get } }))

const ORDERS = [
  vendorOrder({ id: 'a', displayId: 'ORD-1', quantity: 100 }),
  vendorOrder({ id: 'b', displayId: 'ORD-2', latestDesignStatus: 'REJECTED', designVersions: 1, latestDesignComment: 'Name misspelt' }),
  vendorOrder({ id: 'd', displayId: 'ORD-4', artworkApproved: true, latestDesignStatus: 'APPROVED', designVersions: 1 }),
]

function renderQueue() {
  return renderWithProviders(
    <Routes>
      <Route path="/vendor/orders" element={<VendorOrdersPage />} />
      <Route path="/vendor/orders/:id" element={<h1>Order workspace</h1>} />
    </Routes>,
    { route: '/vendor/orders' },
  )
}

describe('VendorOrdersPage on a phone', () => {
  beforeEach(() => get.mockReset().mockImplementation(fakeVendorApi(ORDERS)))

  it('shows each order as one compact card that opens it: what it needs, what to make, how many, for whom', async () => {
    renderQueue()
    const card = await screen.findByRole('link', { name: 'Open ORD-1' })
    expect(card).toHaveTextContent('Needs artwork')
    expect(card).toHaveTextContent('Prescription Pad')
    expect(card).toHaveTextContent('100')
    expect(card).toHaveTextContent('Dr. Asha Shah (P-1001)')
    expect(card).toHaveTextContent('Alembic')
    // No table, and no per-column labels repeated on every card.
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(card).not.toHaveTextContent(/COMPANY|RECIPIENT/)

    await userEvent.click(card)
    expect(await screen.findByRole('heading', { name: 'Order workspace' })).toBeInTheDocument()
  })

  it('puts the customer’s note on a card whose proof was sent back, so it is read without opening the order', async () => {
    renderQueue()
    const card = await screen.findByRole('link', { name: 'Open ORD-2' })
    expect(within(card).getByText('Changes requested')).toBeInTheDocument()
    expect(card).toHaveTextContent('“Name misspelt”')
  })

  it('swaps the stage tabs for pills that filter the cards', async () => {
    renderQueue()
    await screen.findByRole('link', { name: 'Open ORD-1' })
    await userEvent.click(screen.getByRole('tab', { name: /Ready to print/ }))
    expect(await screen.findByRole('link', { name: 'Open ORD-4' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open ORD-1' })).not.toBeInTheDocument()
  })
})
