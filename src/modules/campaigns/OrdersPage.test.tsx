import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrderDesign } from '@/api/orderDesigns'
import type { Order } from '@/api/orders'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { OrdersPage } from './OrdersPage'

const listOrders = vi.hoisted(() => vi.fn())
const listOrderDesigns = vi.hoisted(() => vi.fn())
const approveOrderDesign = vi.hoisted(() => vi.fn())
const rejectOrderDesign = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/orders', async (importOriginal) => ({ ...(await importOriginal<object>()), listOrders }))
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
    recipientPhone: '9800000001',
    recipientPhotoUrl: null,
    totalPrice: 200,
    quantity: 5,
    orgUnitName: 'N1',
    artworkRequired: true,
    warehouseName: null,
    source: 'QUICK_GIFT',
    status: 'PRODUCTION_QUEUE',
    assignedVendorId: 'v-1',
    assignedVendorName: 'Pad Printers',
    assignmentMode: 'MANUAL',
    assignedAt: '2026-10-20T10:00:00Z',
    createdAt: '2026-10-20T10:00:00Z',
    history: [{ status: 'PROCESSING', at: '2026-10-20T10:00:00Z', changedByName: 'Rahul' }],
    hasPendingDesignReview: false,
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
    uploadedByVendorName: 'Pad Printers',
    reviewedByUserName: null,
    reviewComment: null,
    reviewedAt: null,
    createdAt: '2026-10-21T09:00:00Z',
    ...overrides,
  }
}

function signedInAsMr() {
  useCurrentUser.mockReturnValue({
    data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['quickgift.create', 'order.design.review'] },
    isLoading: false,
  })
}

async function openOrder(name = 'Prescription Pad') {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(name) }))
  return screen.findByRole('dialog')
}

describe('OrdersPage (company)', () => {
  beforeEach(() => {
    signedInAsMr()
    listOrders.mockReset()
    listOrderDesigns.mockReset().mockResolvedValue([])
    approveOrderDesign.mockReset()
    rejectOrderDesign.mockReset()
  })

  it('counts and tabs the orders whose artwork waits on the reviewer', async () => {
    listOrders.mockResolvedValue([
      order({ id: 'o-1', displayId: 'ORD-101', hasPendingDesignReview: true }),
      order({ id: 'o-2', displayId: 'ORD-102', giftName: 'Desk Calendar', status: 'DELIVERED' }),
    ])
    renderWithProviders(<OrdersPage />)
    expect(await screen.findByRole('button', { name: /Artwork to review\s*1/ })).toBeInTheDocument()
    expect(screen.getByText('Desk Calendar')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Needs your review/ }))
    expect(screen.queryByText('Desk Calendar')).not.toBeInTheDocument()
    expect(screen.getByText('ORD-101')).toBeInTheDocument()
  })

  it('shows quantity and org unit in the order sheet, and waits for the vendor before a proof exists', async () => {
    listOrders.mockResolvedValue([order()])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()
    expect(within(sheet).getByText('Quantity').nextElementSibling).toHaveTextContent('5')
    expect(within(sheet).getByText('Org unit').nextElementSibling).toHaveTextContent('N1')
    expect(await within(sheet).findByText(/Waiting for the vendor to upload a proof/)).toBeInTheDocument()
  })

  it('approves the newest proof', async () => {
    listOrders.mockResolvedValue([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([design()])
    approveOrderDesign.mockResolvedValue(design({ status: 'APPROVED' }))
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    expect(await within(sheet).findByRole('img', { name: 'Version 1' })).toHaveAttribute('src', 'https://files.test/proof-v1.png')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(approveOrderDesign).toHaveBeenCalledWith('o-1', 'd-1'))
  })

  it('sends a proof back only with a note for the vendor', async () => {
    listOrders.mockResolvedValue([order({ hasPendingDesignReview: true })])
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

  it('lists earlier versions with the feedback they got, and offers a PDF proof as a file', async () => {
    listOrders.mockResolvedValue([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([
      design({ id: 'd-2', versionNo: 2, fileUrl: 'https://files.test/v2.pdf', fileName: 'v2.pdf' }),
      design({ id: 'd-1', versionNo: 1, status: 'REJECTED', reviewComment: 'Name is misspelt' }),
    ])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    expect(await within(sheet).findByText('Earlier versions')).toBeInTheDocument()
    expect(within(sheet).getByText('“Name is misspelt”')).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Open proof' })).toHaveAttribute('href', 'https://files.test/v2.pdf')
  })

  it('hides the review controls from someone who may not review artwork', async () => {
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['order.track'] }, isLoading: false })
    listOrders.mockResolvedValue([order({ hasPendingDesignReview: true })])
    listOrderDesigns.mockResolvedValue([design()])
    renderWithProviders(<OrdersPage />)
    const sheet = await openOrder()

    expect(within(sheet).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Needs your review/ })).not.toBeInTheDocument()
  })
})
