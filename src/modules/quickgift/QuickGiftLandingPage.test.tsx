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
const requestQuickGiftPhotoLink = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/gifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listActiveGifts }))
vi.mock('@/api/quickGifts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listMyQuickGiftRequests,
  requestQuickGiftPhotoLink,
}))
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
  recipientEmail: 'asha@clinic.in',
  deliveryAddress: '12 MG Road, Pune',
  recipientDob: null,
  doctor: { qualification: 'MBBS, MD', registrationNumber: 'MH-12345', speciality: null, clinicName: 'Shah Heart Clinic' },
  quantity: 5,
  vendorName: 'Pad Printers',
  orgUnitName: 'N1',
  giftMessage: null,
  internalNotes: null,
  photoUrl: null,
  photoFileName: null,
  status: 'APPROVED',
  rejectionReason: null,
  reviewedByName: 'MR North',
  reviewedAt: '2026-10-20T10:00:00Z',
  createdAt: '2026-10-20T10:00:00Z',
  recipientUploadUrl: null,
}

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

describe('QuickGiftLandingPage', () => {
  beforeEach(() => {
    listActiveGifts.mockReset().mockResolvedValue([PAD])
    listMyQuickGiftRequests.mockReset().mockResolvedValue([REQUEST])
    requestQuickGiftPhotoLink.mockReset()
    signedInWith(['request.create', 'product.view', 'recipient_list.manage'])
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
    expect(within(sheet).getByText('MH-12345')).toBeInTheDocument()
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

  it('offers Quick Gift and Launch campaign to someone who may do both', async () => {
    signedInWith(['request.create', 'product.view', 'recipient_list.manage', 'campaign.view', 'campaign.create', 'campaign.edit', 'campaign.publish', 'campaign_entry.view', 'request.approve', 'order.view'])
    renderWithProviders(<GiftStorePage />)
    expect(await screen.findByRole('button', { name: 'Quick Gift' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Launch campaign' })).toBeInTheDocument()
  })

  it('offers neither to someone who may do neither', async () => {
    signedInWith([])
    renderWithProviders(<GiftStorePage />)
    expect(await screen.findByText('Not available to you')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quick Gift' })).not.toBeInTheDocument()
  })
})
