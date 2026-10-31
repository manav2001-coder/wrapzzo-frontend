import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { PlatformDashboardPage } from './PlatformDashboardPage'

const getPlatformDashboard = vi.hoisted(() => vi.fn())
vi.mock('@/api/platformDashboard', () => ({ getPlatformDashboard }))

describe('PlatformDashboardPage', () => {
  beforeEach(() => {
    getPlatformDashboard.mockResolvedValue({
      companies: 5,
      activeCompanies: 4,
      vendors: 3,
      activeVendors: 2,
      users: 40,
      gifts: 12,
      activeGifts: 10,
      orders: 10,
      ordersByStatus: { PROCESSING: 7, DELIVERED: 3 },
    })
  })

  it('shows the platform-wide counts', async () => {
    renderWithProviders(<PlatformDashboardPage />)

    expect(await screen.findByText('Platform dashboard')).toBeInTheDocument()
    expect(await screen.findByText('40')).toBeInTheDocument()
    expect(screen.getByText('4 active')).toBeInTheDocument()
    expect(screen.getByText('Orders by status')).toBeInTheDocument()
  })
})
