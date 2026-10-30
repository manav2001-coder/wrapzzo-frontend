import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Order } from '@/api/orders'
import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { OrdersPage } from './OrdersPage'

const currentUser = vi.hoisted(() => vi.fn())
const listAllOrdersForPlatform = vi.hoisted(() => vi.fn())
const listVendors = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/orders', async (o) => ({ ...(await o<object>()), listAllOrdersForPlatform }))
vi.mock('@/api/vendors', async (o) => ({ ...(await o<object>()), listVendors }))
vi.mock('@/api/companies', async (o) => ({ ...(await o<object>()), listCompanies }))

const order = (id: string, companyId: string, recipientName: string): Order =>
  ({
    id,
    displayId: id.toUpperCase(),
    companyId,
    companyName: companyId,
    campaignId: null,
    campaignName: null,
    submissionId: null,
    giftId: 'g-1',
    giftName: 'Pad',
    giftImageUrl: null,
    recipientName,
    recipientPhone: null,
    recipientPhotoUrl: null,
    totalPrice: null,
    quantity: 1,
    orgUnitName: null,
    artworkRequired: false,
    warehouseName: null,
    source: 'QUICK_GIFT',
    status: 'PROCESSING',
    assignedVendorId: null,
    createdAt: '2026-10-01T00:00:00Z',
  }) as unknown as Order

describe('platform OrdersPage company scope', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(platformStaff(['platform_order.view']))
    listCompanies.mockReset().mockResolvedValue([
      { id: 'c-a', name: 'Alpha Pharma' },
      { id: 'c-b', name: 'Beta Pharma' },
    ])
    listVendors.mockReset().mockResolvedValue([])
    listAllOrdersForPlatform.mockReset().mockResolvedValue([order('o-a', 'c-a', 'Dr. Alpha'), order('o-b', 'c-b', 'Dr. Beta')])
  })

  it('opens on the first company’s orders only', async () => {
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('Dr. Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Dr. Beta')).not.toBeInTheDocument()
  })

  it('shows the company named in the URL instead', async () => {
    renderWithProviders(<OrdersPage />, { route: '/admin/orders?company=c-b' })

    await waitFor(() => expect(screen.getByText('Dr. Beta')).toBeInTheDocument())
    expect(screen.queryByText('Dr. Alpha')).not.toBeInTheDocument()
  })
})
