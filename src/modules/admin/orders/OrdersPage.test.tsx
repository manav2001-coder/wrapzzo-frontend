import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Order } from '@/api/orders'
import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen } from '@/test/test-utils'
import { OrdersPage } from './OrdersPage'

const currentUser = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const listVendors = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/lib/axiosClient', async (o) => ({ ...(await o<object>()), apiClient: { get } }))
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
    // The server does the scoping: it answers for the company the table asks about (a companyId filter).
    const orders = [order('o-a', 'c-a', 'Dr. Alpha'), order('o-b', 'c-b', 'Dr. Beta')]
    get.mockReset().mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url === '/api/platform/orders/page') {
        const filters = JSON.parse(String(config?.params?.filters ?? '[]')) as { field: string; value: string }[]
        const companyId = filters.find((filter) => filter.field === 'companyId')?.value
        const rows = orders.filter((o) => o.companyId === companyId)
        return { data: { data: rows, total: rows.length, page: 0, pageSize: 10, hasMore: false } }
      }
      if (url === '/api/platform/orders/summary') return { data: { total: 1, byStatus: {}, awaitingReview: 0, unassigned: 1 } }
      return { data: [] }
    })
  })

  it('opens on the first company’s orders only, asking the server for just that company', async () => {
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('Dr. Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Dr. Beta')).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/platform/orders/page', expect.objectContaining({ params: expect.objectContaining({ page: 0 }) }))
    expect(get).toHaveBeenCalledWith('/api/platform/orders/summary', { params: { companyId: 'c-a' } })
  })

  it('offers vendor assignment only to someone who may manage orders', async () => {
    renderWithProviders(<OrdersPage />)
    expect(await screen.findByText('Dr. Alpha')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Auto-assign' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign vendor' })).not.toBeInTheDocument()
  })

  it('shows the assignment actions to someone with platform_order.manage', async () => {
    currentUser.mockReturnValue(platformStaff(['platform_order.view', 'platform_order.manage']))
    renderWithProviders(<OrdersPage />)
    expect(await screen.findByText('Dr. Alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auto-assign' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign vendor' })).toBeInTheDocument()
  })
})
