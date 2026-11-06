import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { ApprovalQueuePage } from './ApprovalQueuePage'

const listPendingOrderApprovals = vi.hoisted(() => vi.fn())
const listPendingArtworkApprovals = vi.hoisted(() => vi.fn())
const approveOrderDesign = vi.hoisted(() => vi.fn())
const rejectOrderDesign = vi.hoisted(() => vi.fn())
vi.mock('@/api/orderApprovals', async (importOriginal) => ({ ...(await importOriginal<object>()), listPendingOrderApprovals }))
vi.mock('@/api/orderDesigns', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listPendingArtworkApprovals,
  approveOrderDesign,
  rejectOrderDesign,
}))
// A zonal manager: no Quick Gift approval key, just a team.
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ data: { companyId: 'c1', companyName: 'Alembic', permissions: ['order.view', 'approval.view', 'approval.decide'], managesTeam: true }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

const PROOF = {
  designId: 'd-2',
  orderId: 'o-1',
  orderDisplayId: 'ORD-42',
  giftName: 'Rx Pad A5',
  recipientName: 'Dr. Asha Shah',
  quantity: 100,
  requestedByName: 'Rahul Deshmukh',
  versionNo: 2,
  fileUrl: 'https://files.test/proof-v2.pdf',
  fileName: 'proof-v2.pdf',
  vendorName: 'Shree Ganesh Offset Printers',
  mrApprovedByName: 'Rahul Deshmukh',
  mrApprovedAt: '2026-10-27T09:00:00Z',
  approvalLevel: 1,
  approvalLevels: 2,
  waitingOnName: 'Sanjay Kulkarni',
  covering: false,
  approvals: [
    { level: 0, decision: 'APPROVED', decidedByName: 'Rahul Deshmukh', onBehalfOfName: null, comment: null, decidedAt: '2026-10-27T09:00:00Z' },
  ],
}

describe('ApprovalQueuePage', () => {
  beforeEach(() => {
    listPendingOrderApprovals.mockReset().mockResolvedValue([])
    listPendingArtworkApprovals.mockReset().mockResolvedValue([PROOF])
    approveOrderDesign.mockReset().mockResolvedValue({ ...PROOF, id: 'd-2', status: 'APPROVED' })
    rejectOrderDesign.mockReset().mockResolvedValue({ ...PROOF, id: 'd-2', status: 'REJECTED' })
  })

  async function openDrawer() {
    await userEvent.click(await screen.findByRole('button', { name: /Rx Pad A5/ }))
    return screen.findByRole('dialog')
  }

  it('lists the proofs as a table under the Artwork approvals tab', async () => {
    renderWithProviders(<ApprovalQueuePage />)
    expect(await screen.findByText('Rx Pad A5')).toBeInTheDocument()
    expect(screen.getByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(screen.getByText('Level 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Artwork approvals/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps order requests on their own tab, and opens on it when only orders are waiting', async () => {
    listPendingArtworkApprovals.mockResolvedValue([])
    listPendingOrderApprovals.mockResolvedValue([
      { orderId: 'o-9', displayId: 'ORD-9', giftName: 'Desk Calendar', recipientName: 'Dr. Mehta', recipientPcode: null, quantity: 2, totalPrice: null,
        requestedByName: 'Mira MR', orgUnitName: null, giftMessage: null, internalNotes: null, requestedAt: '2026-11-06T10:00:00Z' },
    ])
    renderWithProviders(<ApprovalQueuePage />)
    expect(await screen.findByText(/ORD-9 · Desk Calendar/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Order requests/ })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('tab', { name: /Artwork approvals/ }))
    expect(await screen.findByText('No artwork waiting for your approval')).toBeInTheDocument()
    expect(screen.queryByText(/ORD-9 · Desk Calendar/)).not.toBeInTheDocument()
  })

  it("opens a drawer with the proof and trail, and gives the manager's approval", async () => {
    renderWithProviders(<ApprovalQueuePage />)
    const drawer = await openDrawer()
    expect(within(drawer).getByText('Waiting on').nextElementSibling).toHaveTextContent('Sanjay Kulkarni')
    expect(within(drawer).queryByText(/Covering for/)).not.toBeInTheDocument()
    await userEvent.click(within(drawer).getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(approveOrderDesign).toHaveBeenCalledWith('o-1', 'd-2'))
  })

  it('opens the proof in a dialog from the drawer', async () => {
    renderWithProviders(<ApprovalQueuePage />)
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getAllByRole('button', { name: 'View proof' })[0])
    const dialog = await screen.findByRole('dialog', { name: /Version \d+ · ORD-42/ })
    expect(within(dialog).getByTitle(/Version \d+ · ORD-42/)).toHaveAttribute('src', 'https://files.test/proof-v2.pdf')
  })

  it('says when the approver is covering a level for the manager it waits on', async () => {
    listPendingArtworkApprovals.mockResolvedValue([{ ...PROOF, approvalLevel: 2, covering: true, waitingOnName: 'Ravi Menon' }])
    renderWithProviders(<ApprovalQueuePage />)
    const drawer = await openDrawer()
    expect(within(drawer).getByText('Covering for Ravi Menon')).toBeInTheDocument()
    expect(within(drawer).getAllByText(/Level 2 of 2/).length).toBeGreaterThan(0)
  })

  it('sends the proof back to the vendor only with a note', async () => {
    renderWithProviders(<ApprovalQueuePage />)
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getByRole('button', { name: /request changes/i }))
    const send = await screen.findByRole('button', { name: 'Send back to vendor' })
    expect(send).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/what should change/i), 'Use the new clinic address')
    await userEvent.click(send)
    await waitFor(() => expect(rejectOrderDesign).toHaveBeenCalledWith('o-1', 'd-2', 'Use the new clinic address'))
  })

  it('says when nothing is waiting', async () => {
    listPendingArtworkApprovals.mockResolvedValue([])
    renderWithProviders(<ApprovalQueuePage />)
    expect(await screen.findByText('No artwork waiting for your approval')).toBeInTheDocument()
  })
})
