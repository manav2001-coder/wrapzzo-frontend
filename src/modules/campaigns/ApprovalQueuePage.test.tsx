import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ApprovalQueuePage } from './ApprovalQueuePage'

const listPendingArtworkApprovals = vi.hoisted(() => vi.fn())
const approveOrderDesign = vi.hoisted(() => vi.fn())
const rejectOrderDesign = vi.hoisted(() => vi.fn())
vi.mock('@/api/orderDesigns', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listPendingArtworkApprovals,
  approveOrderDesign,
  rejectOrderDesign,
}))
vi.mock('@/api/doctorRequests', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listPendingDoctorChangeRequests: async () => [],
}))
// A zonal manager: no Quick Gift approval key, just a team.
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ data: { companyId: 'c1', companyName: 'Alembic', permissions: ['order.track'], managesTeam: true }, isLoading: false }),
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

describe('ApprovalQueuePage — artwork final approval', () => {
  beforeEach(() => {
    listPendingArtworkApprovals.mockReset().mockResolvedValue([PROOF])
    approveOrderDesign.mockReset().mockResolvedValue({ ...PROOF, id: 'd-2', status: 'APPROVED' })
    rejectOrderDesign.mockReset().mockResolvedValue({ ...PROOF, id: 'd-2', status: 'REJECTED' })
  })

  it("shows the MR-approved proof and gives the manager's final approval", async () => {
    renderWithProviders(<ApprovalQueuePage />)
    // No Quick Gift tab for a manager without that key.
    expect(screen.queryByRole('tab', { name: /quick gift/i })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('tab', { name: /artwork/i }))

    expect(await screen.findByText('Rx Pad A5 · ORD-42')).toBeInTheDocument()
    expect(screen.getByText(/Level 1 of 2 · MR approved by Rahul Deshmukh/)).toBeInTheDocument()
    expect(screen.getByText(/waiting on Sanjay Kulkarni/)).toBeInTheDocument()
    expect(screen.queryByText(/Covering for/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(approveOrderDesign).toHaveBeenCalledWith('o-1', 'd-2'))
  })

  it('says when the approver is covering a level for the manager it waits on', async () => {
    listPendingArtworkApprovals.mockResolvedValue([{ ...PROOF, approvalLevel: 2, covering: true, waitingOnName: 'Ravi Menon' }])
    approveOrderDesign.mockResolvedValue({ ...PROOF, id: 'd-2', status: 'APPROVED' })
    renderWithProviders(<ApprovalQueuePage />)
    await userEvent.click(await screen.findByRole('tab', { name: /artwork/i }))
    expect(await screen.findByText('Covering for Ravi Menon')).toBeInTheDocument()
    expect(screen.getByText(/Level 2 of 2/)).toBeInTheDocument()
  })

  it('sends the proof back to the vendor with a note', async () => {
    renderWithProviders(<ApprovalQueuePage />)
    await userEvent.click(await screen.findByRole('tab', { name: /artwork/i }))
    await userEvent.click(await screen.findByRole('button', { name: /request changes/i }))
    await userEvent.type(screen.getByLabelText(/what should change/i), 'Use the new clinic address')
    await userEvent.click(screen.getByRole('button', { name: 'Send back to vendor' }))
    await waitFor(() => expect(rejectOrderDesign).toHaveBeenCalledWith('o-1', 'd-2', 'Use the new clinic address'))
  })
})
