import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DashboardSummary } from '@/api/dashboard'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { DashboardPage } from './DashboardPage'

const getDashboard = vi.hoisted(() => vi.fn())
const getDashboardDrilldown = vi.hoisted(() => vi.fn())
const listUpcomingBirthdays = vi.hoisted(() => vi.fn())
vi.mock('@/api/dashboard', async (o) => ({ ...(await o<object>()), getDashboard, getDashboardDrilldown }))
vi.mock('@/api/recipients', async (o) => ({ ...(await o<object>()), listUpcomingBirthdays }))

const SUMMARY: DashboardSummary = {
  companyName: 'Alembic',
  companyWide: true,
  campaignsRunning: 2,
  giftsInProgress: 4,
  dispatched: 1,
  delivered: 7,
  submissionsPending: 0,
  quickGiftsThisMonth: 5,
  quickGiftsPending: 3,
  monthlySpend: 12000,
  orderSourceBreakdown: { CAMPAIGN: 6, QUICK_GIFT: 5 },
  quickGiftStatusBreakdown: { APPROVED: 4, SUBMITTED: 1 },
  submissionStatusBreakdown: {},
  activityTrend: [],
  topGifts: [],
  topCampaigns: [],
  topDepartments: [],
  upcomingDeadlines: [],
  recentCampaigns: [],
  recentActivity: [],
  recentOrders: [
    {
      id: 'o-1',
      displayId: 'ORD-101',
      giftName: 'Prescription Pad',
      giftImageUrl: null,
      recipientName: 'Dr. Asha',
      requesterName: 'Rahul',
      status: 'DISPATCHED',
      source: 'QUICK_GIFT',
      createdAt: '2026-10-20T10:00:00Z',
      history: [],
    },
  ],
}

describe('DashboardPage', () => {
  beforeEach(() => {
    getDashboard.mockReset().mockResolvedValue(SUMMARY)
    getDashboardDrilldown.mockReset().mockResolvedValue({ title: 'Monthly spend', rows: [] })
    listUpcomingBirthdays.mockReset().mockResolvedValue([])
  })

  it('greets the company and shows its numbers', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByRole('heading', { name: 'Alembic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quick Gifts pending\s*3/ })).toBeInTheDocument()
    expect(screen.getByText('Prescription Pad')).toBeInTheDocument()
  })

  it('opens an order from the timeline with its progress', async () => {
    renderWithProviders(<DashboardPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Prescription Pad/ }))
    expect(await screen.findByRole('dialog', { name: 'Prescription Pad' })).toHaveTextContent('Requested by Rahul')
  })

  it('drills into the records behind a number', async () => {
    renderWithProviders(<DashboardPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Quick Gifts this month/ }))
    await waitFor(() => expect(getDashboardDrilldown).toHaveBeenCalled())
    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument()
  })

  it('says when there is nothing to show yet', async () => {
    getDashboard.mockResolvedValue({
      ...SUMMARY,
      campaignsRunning: 0,
      giftsInProgress: 0,
      dispatched: 0,
      delivered: 0,
      quickGiftsThisMonth: 0,
      recentOrders: [],
    })
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Nothing to show yet')).toBeInTheDocument()
  })
})
