import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Campaign } from '@/api/campaigns'
import type { QuickGiftRequest } from '@/api/quickGifts'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { ApprovalQueuePage } from './ApprovalQueuePage'
import { CampaignDetailPage } from './CampaignDetailPage'
import { CampaignListPage } from './CampaignListPage'
import { MyCampaignsPage } from './MyCampaignsPage'
import { SubmissionFormPage } from './SubmissionFormPage'

const api = vi.hoisted(() => ({
  listCampaigns: vi.fn(),
  getCampaign: vi.fn(),
  activateCampaign: vi.fn(),
  closeCampaign: vi.fn(),
  getAudienceOptions: vi.fn(),
  listCampaignSubmissions: vi.fn(),
  listMySubmissions: vi.fn(),
  createSubmission: vi.fn(),
  listPendingQuickGiftApprovals: vi.fn(),
  approveQuickGiftRequest: vi.fn(),
  rejectQuickGiftRequest: vi.fn(),
  listPendingDoctorChangeRequests: vi.fn(),
  listActiveGifts: vi.fn(),
}))
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/campaigns', async (o) => ({ ...(await o<object>()), ...api }))
vi.mock('@/api/submissions', async (o) => ({ ...(await o<object>()), ...api }))
vi.mock('@/api/quickGifts', async (o) => ({ ...(await o<object>()), ...api }))
vi.mock('@/api/doctorRequests', async (o) => ({ ...(await o<object>()), ...api }))
vi.mock('@/api/gifts', async (o) => ({ ...(await o<object>()), ...api }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    displayId: 'CMP-1',
    name: 'Diwali 2026',
    purpose: 'FESTIVAL',
    recipientCategory: 'HCP_DOCTOR',
    gifts: [{ id: 'g-1', name: 'Desk Plant', photoRequired: false }],
    instructions: 'Send one per doctor.',
    submissionDeadline: null,
    status: 'DRAFT',
    fields: [
      { id: 'f-1', fieldKey: 'recipientName', label: 'Recipient name', fieldType: 'TEXT', required: true, placeholder: null, options: [], displayOrder: 0 },
      { id: 'f-2', fieldKey: 'recipientPhone', label: 'Phone', fieldType: 'PHONE', required: true, placeholder: null, options: [], displayOrder: 1 },
    ],
    audiences: [],
    submissionCount: 3,
    pendingApprovalCount: 1,
    orderCount: 2,
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'co-1', companyName: 'Alembic', permissions }, isLoading: false })
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset())
  api.getAudienceOptions.mockResolvedValue({ orgUnits: [], users: [] })
  api.listCampaignSubmissions.mockResolvedValue([])
  api.listMySubmissions.mockResolvedValue([])
  api.listActiveGifts.mockResolvedValue([])
  api.listPendingDoctorChangeRequests.mockResolvedValue([])
  signedInWith(['campaign.manage', 'campaign.approve', 'campaign.submit'])
})

describe('CampaignListPage', () => {
  it('totals the campaigns and filters them by status', async () => {
    api.listCampaigns.mockResolvedValue([campaign(), campaign({ id: 'c-2', name: 'Launch', status: 'ACTIVE' })])
    renderWithProviders(<CampaignListPage />)
    expect(await screen.findByRole('heading', { name: 'Diwali 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New campaign/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Active/ }))
    expect(screen.queryByRole('heading', { name: 'Diwali 2026' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Launch' })).toBeInTheDocument()
  })
})

describe('CampaignDetailPage', () => {
  function renderDetail() {
    return renderWithProviders(
      <Routes>
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
      </Routes>,
      { route: '/campaigns/c-1' },
    )
  }

  it('activates a draft campaign after confirming', async () => {
    api.getCampaign.mockResolvedValue(campaign())
    api.activateCampaign.mockResolvedValue(campaign({ status: 'ACTIVE' }))
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: 'Activate' }))
    const dialog = await screen.findByRole('dialog', { name: 'Activate campaign?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Activate' }))
    await waitFor(() => expect(api.activateCampaign).toHaveBeenCalledWith('c-1'))
  })

  it('shows a member only their own submissions, with no audience or lifecycle controls', async () => {
    signedInWith(['campaign.submit'])
    api.getCampaign.mockResolvedValue(campaign({ status: 'ACTIVE' }))
    renderDetail()
    expect(await screen.findByText(/You're in the audience for this campaign/)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Audience' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Submit a recipient/ })).toBeInTheDocument()
  })
})

describe('MyCampaignsPage', () => {
  it('lists open campaigns to submit into', async () => {
    api.listCampaigns.mockResolvedValue([campaign({ status: 'ACTIVE' }), campaign({ id: 'c-2', name: 'Old one', status: 'CLOSED' })])
    renderWithProviders(<MyCampaignsPage />)
    expect(await screen.findByRole('heading', { name: 'Diwali 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Old one' })).not.toBeInTheDocument()
  })
})

describe('SubmissionFormPage', () => {
  it('requires the campaign’s required fields, then submits each row', async () => {
    api.getCampaign.mockResolvedValue(campaign({ status: 'ACTIVE' }))
    api.createSubmission.mockResolvedValue({ id: 's-1', recipientUploadUrl: null })
    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:id/submit" element={<SubmissionFormPage />} />
        <Route path="/campaigns/:id" element={<h1>Campaign page</h1>} />
      </Routes>,
      { route: '/campaigns/c-1/submit' },
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Recipient name is required.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Recipient name, row 1'), 'Dr. Asha')
    await userEvent.type(screen.getByLabelText('Phone, row 1'), '9800000001')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() =>
      expect(api.createSubmission).toHaveBeenCalledWith('c-1', 'g-1', { recipientName: 'Dr. Asha', recipientPhone: '9800000001' }),
    )
    expect(await screen.findByRole('heading', { name: 'Campaign page' })).toBeInTheDocument()
  })
})

describe('ApprovalQueuePage', () => {
  const request = {
    id: 'q-1',
    giftName: 'Desk Plant',
    recipientName: 'Dr. Asha',
    recipientPhone: '9800000001',
    deliveryAddress: 'Pune',
    requestedByName: 'Rahul',
    quantity: 2,
    vendorName: 'Pad Printers',
    giftMessage: null,
    createdAt: '2026-10-20T10:00:00Z',
  } as unknown as QuickGiftRequest

  it('approves a Quick Gift request, and rejects one only with a reason', async () => {
    api.listPendingQuickGiftApprovals.mockResolvedValue([request])
    api.approveQuickGiftRequest.mockResolvedValue({ ...request, recipientUploadUrl: null })
    api.rejectQuickGiftRequest.mockResolvedValue(request)
    renderWithProviders(<ApprovalQueuePage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(api.approveQuickGiftRequest).toHaveBeenCalledWith('q-1'))

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reject Quick Gift request' })
    const reject = within(dialog).getByRole('button', { name: 'Reject' })
    expect(reject).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Reason (shown to the requester)'), 'Duplicate')
    await userEvent.click(reject)
    await waitFor(() => expect(api.rejectQuickGiftRequest).toHaveBeenCalledWith('q-1', 'Duplicate'))
  })

  it('says when nothing is waiting', async () => {
    api.listPendingQuickGiftApprovals.mockResolvedValue([])
    renderWithProviders(<ApprovalQueuePage />)
    expect(await screen.findByText('Nothing pending')).toBeInTheDocument()
  })
})
