import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrderDesign } from '@/api/orderDesigns'
import type { Order } from '@/api/orders'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { OrdersPage } from './OrdersPage'

const get = vi.hoisted(() => vi.fn())
const listOrderDesigns = vi.hoisted(() => vi.fn())
const approveOrderDesign = vi.hoisted(() => vi.fn())
const rejectOrderDesign = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))
vi.mock('@/api/orderDesigns', () => ({ listOrderDesigns, approveOrderDesign, rejectOrderDesign }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o-1',
    displayId: 'ORD-101',
    companyId: 'c-1',
    companyName: 'Alembic',
    campaignId: null,
    campaignName: null,
    submissionId: null,
    giftId: 'g-1',
    giftName: 'Prescription Pad',
    giftImageUrl: null,
    recipientName: 'Dr. Asha Shah',
    recipientPcode: 'P-1001',
    recipientPhone: '9800000001',
    recipientPhotoUrl: null,
    recipientPhotos: [],
    totalPrice: 200,
    quantity: 5,
    orgUnitName: 'N1',
    artworkRequired: true,
    source: 'QUICK_GIFT',
    status: 'PRODUCTION_QUEUE',
    assignedVendorId: 'v-1',
    assignedVendorName: 'Pad Printers',
    assignmentMode: 'MANUAL',
    assignedAt: '2026-10-20T10:00:00Z',
    createdAt: '2026-10-20T10:00:00Z',
    history: [{ status: 'PROCESSING', at: '2026-10-20T10:00:00Z', changedByName: 'Rahul' }],
    hasPendingDesignReview: false,
    approvalStatus: 'NOT_REQUIRED',
    approvalComment: null,
    approvalDecidedByName: null,
    ...overrides,
  }
}

function design(overrides: Partial<OrderDesign> = {}): OrderDesign {
  return {
    id: 'd-1',
    orderId: 'o-1',
    versionNo: 1,
    fileUrl: 'https://files.test/proof-v1.png',
    fileName: 'proof-v1.png',
    status: 'PENDING_REVIEW',
    reviewedByUserName: null,
    firstApprovedByUserName: null,
    firstApprovedAt: null,
    reviewComment: null,
    reviewedAt: null,
    approvalLevel: null,
    approvalLevels: null,
    waitingOnName: null,
    approvals: [],
    createdAt: '2026-10-21T09:00:00Z',
    ...overrides,
  }
}

function signedInAsMr() {
  useCurrentUser.mockReturnValue({
    data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['quick_gift.create', 'gift_store.view', 'doctor.view', 'order.view', 'artwork.review'] },
    isLoading: false,
  })
}

/**
 * The API as the server answers it: a page of the orders (narrowed by the filters the table sends), the figures counted over all
 * of them, and one order by id.
 */
function serve(orders: Order[]) {
  get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/api/orders/page') {
      const filters = JSON.parse(String(config?.params?.filters ?? '[]')) as { field: string }[]
      const rows = filters.some((filter) => filter.field === 'hasPendingDesignReview') ? orders.filter((o) => o.hasPendingDesignReview) : orders
      return { data: { data: rows, total: rows.length, page: 0, pageSize: 10, hasMore: false } }
    }
    if (url === '/api/orders/summary') {
      const byStatus: Record<string, number> = {}
      for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
      return { data: { total: orders.length, byStatus, awaitingReview: orders.filter((o) => o.hasPendingDesignReview).length, unassigned: 0 } }
    }
    const detail = /^\/api\/orders\/(.+)$/.exec(url)
    if (detail) return { data: orders.find((o) => o.id === detail[1]) }
    return { data: [] }
  })
}

async function openOrder(name = 'Prescription Pad') {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(name) }))
  return screen.findByRole('dialog')
}

describe('OrdersPage (company)', () => {
  beforeEach(() => {
    signedInAsMr()
    get.mockReset()
    listOrderDesigns.mockReset().mockResolvedValue([])
    approveOrderDesign.mockReset()
    rejectOrderDesign.mockReset()
  })

  it('counts and tabs the orders whose artwork waits on the reviewer', async () => {
    serve([
      order({ id: 'o-1', displayId: 'ORD-101', hasPendingDesignReview: true }),
      order({ id: 'o-2', displayId: 'ORD-102', giftName: 'Desk Calendar', status: 'DISPATCHED' }),
    ])
    renderWithProviders(<OrdersPage />)
    expect(await screen.findByRole('button', { name: /Artwork to review\s*1/ })).toBeInTheDocument()
    expect(screen.getByText('Desk Calendar')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Needs your review/ }))
    expect(screen.queryByText('Desk Calendar')).not.toBeInTheDocument()
    expect(screen.getByText('ORD-101')).toBeInTheDocument()
  })

  it('shows quantity and org unit in the order sheet, and waits for the vendor before a proof exists', async () => {
    serve([order()])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()
    expect(within(sheet).getByText('Quantity').nextElementSibling).toHaveTextContent('5')
    expect(within(sheet).getByText('Org unit').nextElementSibling).toHaveTextContent('N1')
    expect(await within(sheet).findByText(/Waiting for the vendor to upload a proof/)).toBeInTheDocument()
  })

  it('approves the newest proof', async () => {
    serve([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([design()])
    approveOrderDesign.mockResolvedValue(design({ status: 'APPROVED' }))
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    await userEvent.click((await within(sheet).findAllByRole('button', { name: 'View proof' }))[0])
    const proof = await screen.findByRole('dialog', { name: 'Version 1 proof' })
    expect(within(proof).getByRole('img', { name: 'Version 1 proof' })).toHaveAttribute('src', 'https://files.test/proof-v1.png')
    await userEvent.click(within(proof).getAllByRole('button', { name: 'Close' })[0])
    await userEvent.click(within(sheet).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(approveOrderDesign).toHaveBeenCalledWith('o-1', 'd-1'))
  })

  it('sends a proof back only with a note for the vendor', async () => {
    serve([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([design()])
    rejectOrderDesign.mockResolvedValue(design({ status: 'REJECTED' }))
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    await userEvent.click(await within(sheet).findByRole('button', { name: 'Request changes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Request changes to version 1' })
    const send = within(dialog).getByRole('button', { name: 'Send back to vendor' })
    expect(send).toBeDisabled()

    await userEvent.type(within(dialog).getByLabelText('What should change?'), 'Name is misspelt')
    await userEvent.click(send)
    await waitFor(() => expect(rejectOrderDesign).toHaveBeenCalledWith('o-1', 'd-1', 'Name is misspelt'))
  })

  it('lists earlier versions with the feedback they got, and shows a PDF proof in the viewer', async () => {
    serve([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([
      design({ id: 'd-2', versionNo: 2, fileUrl: 'https://files.test/v2.pdf', fileName: 'v2.pdf' }),
      design({ id: 'd-1', versionNo: 1, status: 'REJECTED', reviewComment: 'Name is misspelt' }),
    ])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    expect(await within(sheet).findByText('Earlier versions')).toBeInTheDocument()
    expect(within(sheet).getByText('“Name is misspelt”')).toBeInTheDocument()
    await userEvent.click(within(sheet).getAllByRole('button', { name: 'View proof' })[0])
    const proof = await screen.findByRole('dialog', { name: 'Version 2 proof' })
    expect(within(proof).getByTitle('Version 2 proof')).toHaveAttribute('src', 'https://files.test/v2.pdf')
    expect(within(proof).getByRole('link', { name: 'Open in new tab' })).toHaveAttribute('href', 'https://files.test/v2.pdf')
  })

  it('lets someone who may not review artwork watch the proofs without deciding on them', async () => {
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['order.view'] }, isLoading: false })
    serve([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([design()])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    // The proof is there to look at...
    expect((await within(sheet).findAllByRole('button', { name: 'View proof' })).length).toBeGreaterThan(0)
    // ...but not to approve or send back, and there is no review tab.
    expect(within(sheet).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Needs your review/ })).not.toBeInTheDocument()
  })

  it('says an order is awaiting approval, and shows the approver\'s note on one that was turned down', async () => {
    serve([
      order({ id: 'o-1', displayId: 'ORD-101', assignedVendorId: null, assignedVendorName: null, approvalStatus: 'PENDING' }),
      order({
        id: 'o-2',
        displayId: 'ORD-102',
        giftName: 'Desk Calendar',
        status: 'CANCELLED',
        approvalStatus: 'REJECTED',
        approvalComment: 'Wrong doctor',
        approvalDecidedByName: 'Ravi RM',
      }),
    ])
    renderWithProviders(<OrdersPage />)
    expect(await screen.findByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.getByText('Not approved')).toBeInTheDocument()

    const sheet = await openOrder('Desk Calendar')
    expect(within(sheet).getByText(/Ravi RM did not approve this order/)).toBeInTheDocument()
    expect(within(sheet).getByText('“Wrong doctor”')).toBeInTheDocument()
  })

  it('never shows a vendor, nor "Unassigned", to someone who raises or approves orders', async () => {
    // The server leaves the vendor out for them; the screen must not fill the gap with "Unassigned".
    serve([order({ assignedVendorId: null, assignedVendorName: null })])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()
    expect(within(sheet).queryByText('Vendor')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /Vendor/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
  })

  it('shows the vendor to the company admin, who holds vendor_identity.view', async () => {
    useCurrentUser.mockReturnValue({
      data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['order.view', 'vendor_identity.view'] },
      isLoading: false,
    })
    serve([order({ assignedVendorName: 'Pad Printers' })])
    renderWithProviders(<OrdersPage />)
    expect(await screen.findByRole('columnheader', { name: /Vendor/ })).toBeInTheDocument()
    const sheet = await openOrder()
    expect(within(sheet).getByText('Pad Printers')).toBeInTheDocument()
  })

  it('narrows the orders by the day they were placed, with quick ranges, and asks the server for exactly that range', async () => {
    serve([order()])
    renderWithProviders(<OrdersPage />)
    await screen.findByRole('button', { name: /Prescription Pad/ })

    await userEvent.click(screen.getByRole('button', { name: /Filters/ }))
    await userEvent.click(await screen.findByText('Pick a date range'))
    await userEvent.click(await screen.findByRole('button', { name: 'Last 7 days' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      const asked = get.mock.calls
        .filter(([url]) => url === '/api/orders/page')
        .map(([, config]) => JSON.parse(String(config?.params?.filters ?? '[]')) as { field: string; operator: string; value: string[] }[])
        .flat()
        .find((filter) => filter.field === 'createdAt')
      expect(asked).toMatchObject({ operator: 'between' })
      // Seven calendar days, today included, as plain dates -- the server reads them in the users' day.
      const [from, to] = asked!.value
      expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000).toBe(6)
    })
  })
})
