import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Gift } from '@/api/gifts'
import type { QuickGiftRequest } from '@/api/quickGifts'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { GiftStorePage } from './GiftStorePage'
import { QuickGiftLandingPage } from './QuickGiftLandingPage'

const listActiveGifts = vi.hoisted(() => vi.fn())
const listMyQuickGiftRequests = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const requestQuickGiftPhotoLink = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/gifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listActiveGifts }))
vi.mock('@/api/quickGifts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestQuickGiftPhotoLink,
}))
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const PAD = {
  id: 'g-pad',
  displayId: 'GID-1',
  name: 'Prescription Pad',
  category: 'Stationery',
  description: null,
  moq: null,
  leadTimeDays: 7,
  active: true,
  photoRequired: false,
  artworkRequired: true,
  modules: ['QUICK_GIFT'],
  price: 40,
  markupFeePercentage: 0,
  commissionFeePercentage: 0,
  totalPrice: 40,
  vendorId: 'v-1',
  vendorName: 'Pad Printers',
  images: [],
  createdAt: '2026-10-01T00:00:00Z',
} satisfies Gift

const REQUEST: QuickGiftRequest = {
  id: 'q-1',
  displayId: 'QG-7',
  orderId: 'o-1',
  orderDisplayId: 'ORD-101',
  giftId: 'g-pad',
  giftName: 'Prescription Pad',
  giftCategory: 'Stationery',
  requestedByName: 'MR North',
  recipientName: 'Dr. Asha Shah',
  recipientPhone: '9800000001',
  recipientPcode: 'P-1001',
  recipientEmail: 'asha@clinic.in',
  deliveryAddress: '12 MG Road, Pune',
  doctor: { qualification: 'MBBS, MD', speciality: null, clinicName: 'Shah Heart Clinic' },
  quantity: 5,
  orgUnitName: 'N1',
  giftMessage: null,
  internalNotes: null,
  photoUrl: null,
  photoFileName: null,
  photos: [],
  status: 'APPROVED',
  rejectionReason: null,
  reviewedByName: 'MR North',
  reviewedAt: '2026-10-20T10:00:00Z',
  createdAt: '2026-10-20T10:00:00Z',
  recipientUploadUrl: null,
  orderApprovalStatus: 'NOT_REQUIRED',
}

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

describe('QuickGiftLandingPage', () => {
  beforeEach(() => {
    listActiveGifts.mockReset().mockResolvedValue([PAD])
    // The server pages the user's own requests (here, the one).
    listMyQuickGiftRequests.mockReset().mockResolvedValue([REQUEST])
    get.mockReset().mockImplementation(async (url: string) => {
      if (url === '/api/quick-gifts/mine/page') {
        const rows = await listMyQuickGiftRequests()
        return { data: { data: rows, total: rows.length, page: 0, pageSize: 10, hasMore: false } }
      }
      const detail = /^\/api\/quick-gifts\/(.+)$/.exec(url)
      if (detail) return { data: (await listMyQuickGiftRequests()).find((r: QuickGiftRequest) => r.id === detail[1]) }
      return { data: [] }
    })
    requestQuickGiftPhotoLink.mockReset()
    signedInWith(['quick_gift.create', 'gift_store.view', 'doctor.view'])
  })

  function renderLanding() {
    return renderWithProviders(
      <Routes>
        <Route path="/quick-gift" element={<QuickGiftLandingPage />} />
        <Route path="/quick-gift/new/:giftId" element={<h1>Form for gift</h1>} />
      </Routes>,
      { route: '/quick-gift' },
    )
  }

  it('opens the form for the gift picked from the catalogue', async () => {
    renderLanding()
    await userEvent.click(await screen.findByRole('button', { name: 'Send this' }))
    expect(screen.getByRole('heading', { name: 'Form for gift' })).toBeInTheDocument()
  })

  it('lists the user’s requests and opens one with its print details', async () => {
    renderLanding()
    await userEvent.click(screen.getByRole('tab', { name: /My requests/ }))
    const row = (await screen.findByText('QG-7')).closest('tr')!
    expect(within(row).getByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(within(row).getByText('Ordered')).toBeInTheDocument()

    await userEvent.click(within(row).getByRole('button', { name: 'Prescription Pad' }))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('P-1001')).toBeInTheDocument()
    expect(within(sheet).getByText('Shah Heart Clinic')).toBeInTheDocument()
    expect(within(sheet).getByText('ORD-101')).toBeInTheDocument()
  })

  it('re-sends the photo link for an ordered request and offers to share it', async () => {
    requestQuickGiftPhotoLink.mockResolvedValue({ recipientUploadUrl: 'https://wrapzzo.test/up/abc' })
    renderLanding()
    await userEvent.click(screen.getByRole('tab', { name: /My requests/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Prescription Pad' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ask the recipient for a photo' }))

    await waitFor(() => expect(requestQuickGiftPhotoLink).toHaveBeenCalledWith('q-1'))
    expect(await screen.findByRole('button', { name: /Copy/ })).toBeInTheDocument()
  })
})

describe('GiftStorePage', () => {
  beforeEach(() => listActiveGifts.mockReset().mockResolvedValue([PAD]))

  it('offers Quick Gift, and nothing about campaigns, to someone who may send one', async () => {
    signedInWith(['quick_gift.create', 'gift_store.view', 'doctor.view', 'order.view'])
    renderWithProviders(<GiftStorePage />)
    expect(await screen.findByRole('button', { name: 'Quick PEL' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /campaign/i })).not.toBeInTheDocument()
  })

  it('offers nothing to someone who may not send a Quick Gift', async () => {
    signedInWith([])
    renderWithProviders(<GiftStorePage />)
    expect(await screen.findByText('Not available to you')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quick PEL' })).not.toBeInTheDocument()
  })
})
