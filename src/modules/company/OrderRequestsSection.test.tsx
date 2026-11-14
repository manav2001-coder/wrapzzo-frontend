import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PendingOrderApproval } from '@/api/orderApprovals'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { OrderRequestsSection } from './OrderRequestsSection'

const listPendingOrderApprovals = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const approveOrder = vi.hoisted(() => vi.fn())
const rejectOrder = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))
vi.mock('@/api/orderApprovals', async (importOriginal) => ({ ...(await importOriginal<object>()), listPendingOrderApprovals, approveOrder, rejectOrder }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

function pending(overrides: Partial<PendingOrderApproval> = {}): PendingOrderApproval {
  return {
    orderId: 'o-1',
    displayId: 'ORD-101',
    giftName: 'Prescription Pad',
    recipientName: 'Dr. Asha Shah',
    recipientPcode: 'PC-ASHA',
    quantity: 5,
    totalPrice: 200,
    requestedByName: 'Mira MR',
    orgUnitName: 'N1',
    giftMessage: null,
    internalNotes: null,
    requestedAt: '2026-11-06T10:00:00Z',
    ...overrides,
  }
}

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

describe('OrderRequestsSection', () => {
  beforeEach(() => {
    get.mockReset().mockImplementation(async (url: string) => {
      if (url === '/api/order-approvals/pending/page') {
        const rows = await listPendingOrderApprovals()
        return { data: { data: rows, total: rows.length, page: 0, pageSize: 10, hasMore: false } }
      }
      return { data: [] }
    })
    listPendingOrderApprovals.mockReset().mockResolvedValue([pending()])
    approveOrder.mockReset().mockResolvedValue(pending())
    rejectOrder.mockReset().mockResolvedValue(pending())
    signedInWith(['approval.view', 'approval.decide'])
  })

  async function openDrawer() {
    await userEvent.click(await screen.findByRole('button', { name: /Prescription Pad/ }))
    return screen.findByRole('dialog')
  }

  it('lists what waits on the approver as a table: the gift, the doctor and who placed it', async () => {
    renderWithProviders(<OrderRequestsSection />)
    expect(await screen.findByText('Prescription Pad')).toBeInTheDocument()
    expect(screen.getByText('ORD-101')).toBeInTheDocument()
    expect(screen.getByText('Dr. Asha Shah (PC-ASHA)')).toBeInTheDocument()
    expect(screen.getByText('Mira MR')).toBeInTheDocument()
  })

  it('says so when nothing waits', async () => {
    listPendingOrderApprovals.mockResolvedValue([])
    renderWithProviders(<OrderRequestsSection />)
    expect(await screen.findByText('No orders waiting for your approval')).toBeInTheDocument()
  })

  it('opens a drawer with the order’s details', async () => {
    renderWithProviders(<OrderRequestsSection />)
    const drawer = await openDrawer()
    expect(within(drawer).getByText('Doctor code').nextElementSibling).toHaveTextContent('PC-ASHA')
    expect(within(drawer).getByText('Org unit').nextElementSibling).toHaveTextContent('N1')
  })

  it('approves an order from the drawer', async () => {
    renderWithProviders(<OrderRequestsSection />)
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(approveOrder).toHaveBeenCalledWith('o-1', undefined))
  })

  it('declines only with a note for the person who placed it', async () => {
    renderWithProviders(<OrderRequestsSection />)
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Decline' }))
    const dialog = await screen.findByRole('dialog', { name: 'Decline ORD-101' })
    const confirm = within(dialog).getByRole('button', { name: 'Decline order' })
    expect(confirm).toBeDisabled()

    await userEvent.type(within(dialog).getByRole('textbox'), 'Wrong doctor')
    await userEvent.click(confirm)
    await waitFor(() => expect(rejectOrder).toHaveBeenCalledWith('o-1', 'Wrong doctor'))
  })

  it('lets someone without the decide key look but not act', async () => {
    signedInWith(['approval.view'])
    renderWithProviders(<OrderRequestsSection />)
    const drawer = await openDrawer()
    expect(within(drawer).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})
