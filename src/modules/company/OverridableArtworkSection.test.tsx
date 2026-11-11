import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { ApprovalQueuePage } from './ApprovalQueuePage'

const get = vi.hoisted(() => vi.fn())
const overrideOrderDesign = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))
vi.mock('@/api/orderDesigns', async (importOriginal) => ({ ...(await importOriginal<object>()), overrideOrderDesign }))
// A regional manager who holds the Override permission as well as the Approvals page.
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    data: { companyId: 'c1', companyName: 'Alembic', permissions: ['order.view', 'approval.view', 'approval.decide', 'artwork.override'], managesTeam: true },
    isLoading: false,
  }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

const BELOW = {
  designId: 'd-7',
  orderId: 'o-7',
  orderDisplayId: 'ORD-77',
  giftName: 'Rx Pad A5',
  recipientName: 'Dr. Asha Shah',
  quantity: 100,
  requestedByName: 'Aditi AM',
  versionNo: 1,
  fileUrl: 'https://files.test/proof-v1.pdf',
  fileName: 'proof-v1.pdf',
  waitingOn: "the MR's review (Aditi AM)",
  waitingLevel: 0,
  yourLevel: 1,
  approvalLevels: 2,
  skipping: ['MR review (Aditi AM)'],
  waitingSince: '2026-11-08T09:00:00Z',
  approvals: [],
}

function pageOf(rows: unknown[]) {
  return { data: { data: rows, total: rows.length, page: 0, pageSize: 10, hasMore: false } }
}

describe('Waiting below you', () => {
  beforeEach(() => {
    get.mockReset().mockImplementation(async (url: string) => {
      if (url === '/api/artwork-approvals/overridable/page') return pageOf([BELOW])
      if (url.endsWith('/pending/page')) return pageOf([])
      return { data: [] }
    })
    overrideOrderDesign.mockReset().mockResolvedValue({ ...BELOW, status: 'PENDING_FINAL_APPROVAL', approvalLevel: 2, approvalLevels: 2, waitingOnName: 'HO of Summit' })
  })

  async function openTab() {
    renderWithProviders(<ApprovalQueuePage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Waiting below you/ }))
  }

  it('is a tab only for someone who holds the Override permission', async () => {
    await openTab()
    expect(await screen.findByText('Rx Pad A5')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/artwork-approvals/overridable/page', expect.anything())
  })

  it('shows what is waiting, on whom, and which steps the approval would skip', async () => {
    await openTab()
    const row = (await screen.findByText('Rx Pad A5')).closest('tr')!
    expect(within(row).getByText("the MR's review (Aditi AM)")).toBeInTheDocument()
    expect(within(row).getByText('MR review (Aditi AM)')).toBeInTheDocument()
  })

  it('asks for confirmation, with an optional reason, before approving in place of the levels below', async () => {
    await openTab()
    await userEvent.click(await screen.findByRole('button', { name: /Rx Pad A5/ }))
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByText('If you approve it now')).toBeInTheDocument()
    expect(within(drawer).getByText('It then moves to level 2 of 2.')).toBeInTheDocument()

    await userEvent.click(within(drawer).getByRole('button', { name: /Approve in place of/ }))
    const confirm = await screen.findByRole('dialog', { name: /Approve in place of the levels below/ })
    expect(within(confirm).getByText(/They will be told/)).toBeInTheDocument()
    expect(overrideOrderDesign).not.toHaveBeenCalled()

    await userEvent.type(within(confirm).getByLabelText(/Reason/), 'AM is on leave')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Approve and skip' }))

    await waitFor(() => expect(overrideOrderDesign).toHaveBeenCalledWith('o-7', 'd-7', 'AM is on leave'))
  })

  it('needs no reason', async () => {
    await openTab()
    await userEvent.click(await screen.findByRole('button', { name: /Rx Pad A5/ }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Approve in place of/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Approve and skip' }))

    await waitFor(() => expect(overrideOrderDesign).toHaveBeenCalledWith('o-7', 'd-7', ''))
  })

  it('says when approving would send the proof straight to the vendor', async () => {
    get.mockImplementation(async (url: string) => (url === '/api/artwork-approvals/overridable/page' ? pageOf([{ ...BELOW, yourLevel: 2, skipping: ['MR review (Aditi AM)', 'Level 1 (Ravi RM)'] }]) : pageOf([])))
    await openTab()
    await userEvent.click(await screen.findByRole('button', { name: /Rx Pad A5/ }))
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByText(/the vendor can print and dispatch/)).toBeInTheDocument()
    expect(within(drawer).getByText('Level 1 (Ravi RM)')).toBeInTheDocument()
  })

  it('keeps the dialog open and shows the reason when the server refuses', async () => {
    overrideOrderDesign.mockRejectedValue(new Error('Only someone above the level this artwork is waiting on can approve it'))
    await openTab()
    await userEvent.click(await screen.findByRole('button', { name: /Rx Pad A5/ }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Approve in place of/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Approve and skip' }))

    await waitFor(() => expect(overrideOrderDesign).toHaveBeenCalled())
    expect(await screen.findByRole('dialog', { name: /Approve in place of the levels below/ })).toBeInTheDocument()
  })
})
