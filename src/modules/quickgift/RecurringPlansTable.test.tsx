import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecurringOrderPlan } from '@/api/recurringOrders'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { RecurringPlansTable } from './RecurringPlansTable'

const listMyRecurringOrderPlans = vi.hoisted(() => vi.fn())
const actOnRecurringOrderPlan = vi.hoisted(() => vi.fn())
vi.mock('@/api/recurringOrders', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listMyRecurringOrderPlans,
  actOnRecurringOrderPlan,
}))

function plan(overrides: Partial<RecurringOrderPlan> = {}): RecurringOrderPlan {
  return {
    id: 'p-1',
    giftId: 'g-pad',
    giftName: 'Prescription Pad',
    vendorName: 'Pad Printers',
    recipientName: 'Dr. Asha Shah',
    recipientPhone: '9800000001',
    deliveryAddress: '12 MG Road, Pune',
    quantity: 200,
    status: 'ACTIVE',
    nextRunOn: '2026-11-27',
    runsCompleted: 1,
    lastError: null,
    createdAt: '2026-10-27T10:00:00Z',
    ...overrides,
  }
}

describe('RecurringPlansTable', () => {
  beforeEach(() => {
    listMyRecurringOrderPlans.mockReset()
    actOnRecurringOrderPlan.mockReset()
  })

  it('places the next order on demand', async () => {
    listMyRecurringOrderPlans.mockResolvedValue([plan()])
    actOnRecurringOrderPlan.mockResolvedValue(plan({ runsCompleted: 2 }))
    renderWithProviders(<RecurringPlansTable />)

    expect(await screen.findByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Place next order now' }))

    await waitFor(() => expect(actOnRecurringOrderPlan).toHaveBeenCalledWith('p-1', 'placeNextNow'))
  })

  it('offers resume for a paused plan and no actions for a stopped one', async () => {
    listMyRecurringOrderPlans.mockResolvedValue([
      plan({ id: 'p-paused', status: 'PAUSED' }),
      plan({ id: 'p-stopped', recipientName: 'Dr. Ravi Rao', status: 'CANCELLED' }),
    ])
    renderWithProviders(<RecurringPlansTable />)

    expect(await screen.findByText('Dr. Ravi Rao')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Resume' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Stop these orders' })).toHaveLength(1)
  })
})
