import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DashboardInsights, DashboardSummary } from '@/api/dashboard'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { DashboardPage } from './DashboardPage'

const getDashboard = vi.hoisted(() => vi.fn())
const getDashboardDrilldown = vi.hoisted(() => vi.fn())
const getDashboardInsights = vi.hoisted(() => vi.fn())
const listUpcomingBirthdays = vi.hoisted(() => vi.fn())
vi.mock('@/api/dashboard', async (o) => ({ ...(await o<object>()), getDashboard, getDashboardDrilldown, getDashboardInsights }))
vi.mock('@/api/recipients', async (o) => ({ ...(await o<object>()), listUpcomingBirthdays }))

const SUMMARY: DashboardSummary = {
  companyName: 'Alembic',
  companyWide: true,
  giftsInProgress: 4,
  dispatched: 1,
  delivered: 7,
  quickGiftsThisMonth: 5,
  quickGiftsPending: 3,
  pelsRequested: 1500,
  doctorsRequested: 6,
  pelsServed: 900,
  doctorsServed: 4,
  orderSourceBreakdown: { QUICK_GIFT: 5 },
  quickGiftStatusBreakdown: { APPROVED: 4, SUBMITTED: 1 },
  activityTrend: [],
  topGifts: [],
  topDepartments: [],
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

const PERIOD = { requested: 1500, served: 900, doctorsRequested: 6, doctorsServed: 4, avgDaysToDeliver: 6.5 }
const STAGES: DashboardInsights['stages'] = [
  { stage: 'APPROVAL', count: 0, stuck: 0, oldestDays: 0, thresholdDays: 2 },
  { stage: 'ARTWORK', count: 3, stuck: 2, oldestDays: 9, thresholdDays: 4 },
  { stage: 'PRODUCTION', count: 1, stuck: 0, oldestDays: 2, thresholdDays: 7 },
  { stage: 'TRANSIT', count: 0, stuck: 0, oldestDays: 0, thresholdDays: 5 },
]
const TEAM_INSIGHTS: DashboardInsights = {
  scope: 'TEAM',
  range: '30d',
  current: PERIOD,
  previous: { ...PERIOD, requested: 1000, avgDaysToDeliver: 8 },
  coverage: { assigned: 20, covered: 12 },
  stages: STAGES,
  rejectedRequests: 0,
  weekly: [],
  teamSize: 2,
  team: [
    { userId: 'u1', name: 'Asha Rao', unitName: 'Patna', requested: 0, served: 0, doctorsAssigned: 10, doctorsCovered: 0, inPipeline: 0, lastActivityAt: null },
    { userId: 'u2', name: 'Ravi Kumar', unitName: 'Delhi', requested: 40, served: 30, doctorsAssigned: 10, doctorsCovered: 8, inPipeline: 2, lastActivityAt: '2026-11-10T10:00:00Z' },
  ],
}
const PERSONAL_INSIGHTS: DashboardInsights = { ...TEAM_INSIGHTS, scope: 'PERSONAL', coverage: { assigned: 5, covered: 3 }, team: [], teamSize: 0 }

describe('DashboardPage', () => {
  beforeEach(() => {
    getDashboard.mockReset().mockResolvedValue(SUMMARY)
    getDashboardInsights.mockReset().mockResolvedValue(TEAM_INSIGHTS)
    getDashboardDrilldown.mockReset().mockResolvedValue({ title: 'PELs created per doctor', rows: [] })
    listUpcomingBirthdays.mockReset().mockResolvedValue([])
  })

  it('greets the company and shows its numbers', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ })).toBeInTheDocument()
    expect(screen.getByText('Alembic')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Quick Gift requests pending/ })).not.toBeInTheDocument()
    expect(screen.getByText('Prescription Pad')).toBeInTheDocument()
  })

  it('opens an order from the timeline with its progress', async () => {
    renderWithProviders(<DashboardPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Prescription Pad/ }))
    expect(await screen.findByRole('dialog', { name: 'Prescription Pad' })).toHaveTextContent('Requested by Rahul')
  })

  it('leads with the period figures against the period before, and shows no prices', async () => {
    renderWithProviders(<DashboardPage />)
    const requested = await screen.findByRole('button', { name: /PELs requested/ })
    expect(requested).toHaveTextContent('1,500')
    expect(requested).toHaveTextContent('6 doctors')
    expect(requested).toHaveTextContent('50%') // up from 1,000
    expect(screen.getByRole('button', { name: /PELs delivered/ })).toHaveTextContent('900')
    expect(screen.getByText('6.5')).toBeInTheDocument()
    expect(screen.queryByText(/spend|revenue/i)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/₹|\bINR\b/)
  })

  it('breaks the PELs down per doctor', async () => {
    getDashboardDrilldown.mockResolvedValue({
      title: 'PELs created per doctor',
      rows: [{ displayId: null, title: 'Dr. Asha Shah', subtitle: '2 orders', status: null, at: '2026-10-20T10:00:00Z', quantity: 300 }],
    })
    renderWithProviders(<DashboardPage />)
    await userEvent.click(await screen.findByRole('button', { name: /PELs requested/ }))
    await waitFor(() => expect(getDashboardDrilldown).toHaveBeenCalledWith('pelsRequested', ''))
    const dialog = await screen.findByRole('dialog', { name: 'PELs created per doctor' })
    expect(dialog).toHaveTextContent('Dr. Asha Shah')
    expect(dialog).toHaveTextContent('300 PELs')
  })

  it('shows where orders are waiting and flags the stage that has waited too long', async () => {
    renderWithProviders(<DashboardPage />)
    const artwork = await screen.findByRole('button', { name: /Artwork & proof/ })
    expect(artwork).toHaveTextContent('2 over 4 days')
    expect(screen.getByText(/2 orders have been waiting longer than usual/)).toBeInTheDocument()
    await userEvent.click(artwork)
    await waitFor(() => expect(getDashboardDrilldown).toHaveBeenCalledWith('orderStage', 'ARTWORK'))
  })

  it('shows a manager their team and lets them narrow to who needs a nudge', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Your team')).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 haven't requested a PEL/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Needs a nudge/ }))
    expect(screen.getAllByText('Asha Rao').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })

  it('shows a field person their own doctors and who is still waiting', async () => {
    getDashboardInsights.mockResolvedValue(PERSONAL_INSIGHTS)
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Your doctors')).toBeInTheDocument()
    expect(screen.queryByText('Your team')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /See the 2 doctors still waiting/ }))
    await waitFor(() => expect(getDashboardDrilldown).toHaveBeenCalledWith('uncoveredDoctors', '30d'))
  })

  it('reloads the figures for another period', async () => {
    renderWithProviders(<DashboardPage />)
    await userEvent.click(await screen.findByRole('radio', { name: '90 days' }))
    await waitFor(() => expect(getDashboardInsights).toHaveBeenCalledWith('90d'))
  })

  it('says plainly when nothing is waiting on you', async () => {
    getDashboardInsights.mockResolvedValue({ ...TEAM_INSIGHTS, stages: STAGES.map((st) => ({ ...st, stuck: 0 })) })
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('You’re all caught up')).toBeInTheDocument()
  })

  it('says when there is nothing to show yet', async () => {
    getDashboard.mockResolvedValue({
      ...SUMMARY,
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
