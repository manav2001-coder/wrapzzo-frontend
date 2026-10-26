import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Gift } from '@/api/gifts'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { QuickGiftFormPage } from './QuickGiftFormPage'

const listActiveGifts = vi.hoisted(() => vi.fn())
const createQuickGiftRequest = vi.hoisted(() => vi.fn())
const showToast = vi.hoisted(() => vi.fn())
vi.mock('@/api/gifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listActiveGifts }))
vi.mock('@/api/quickGifts', async (importOriginal) => ({ ...(await importOriginal<object>()), createQuickGiftRequest }))
vi.mock('@/lib/toast', () => ({ showToast, showApiError: vi.fn() }))

const PAD: Gift = {
  id: 'g-pad',
  displayId: 'GID-1',
  name: 'Prescription Pad',
  category: 'Stationery',
  description: 'A5, 100 leaves',
  moq: null,
  leadTimeDays: 7,
  active: true,
  photoRequired: false,
  artworkRequired: true,
  modules: ['QUICK_GIFT', 'BULK_GIFTING', 'CAMPAIGN'],
  price: 40,
  markupFeePercentage: 0,
  commissionFeePercentage: 0,
  totalPrice: 40,
  vendorId: 'v-1',
  vendorName: 'Pad Printers',
  images: [],
  createdAt: '2026-10-01T00:00:00Z',
}

function renderForm(gift: Gift = PAD) {
  listActiveGifts.mockResolvedValue([gift])
  return renderWithProviders(
    <Routes>
      <Route path="/quick-gift/new/:giftId" element={<QuickGiftFormPage />} />
      <Route path="/quick-gift" element={<h1>My quick gifts</h1>} />
    </Routes>,
    { route: `/quick-gift/new/${gift.id}` },
  )
}

async function fillDoctor() {
  await userEvent.type(screen.getByPlaceholderText('Recipient name *'), 'Dr. Asha Shah')
  await userEvent.type(screen.getByPlaceholderText('Phone *'), '9800000001')
  await userEvent.type(screen.getByPlaceholderText('Delivery address *'), '12 MG Road, Pune')
}

describe('QuickGiftFormPage -- prescription pads', () => {
  beforeEach(() => {
    listActiveGifts.mockReset()
    createQuickGiftRequest.mockReset()
    showToast.mockReset()
  })

  it('names the vendor and asks for the doctor details a pad is printed with', async () => {
    renderForm()
    expect(await screen.findByText('Supplied by Pad Printers')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. MH-12345')).toBeInTheDocument()
    expect(screen.getByText('Quantity *')).toBeInTheDocument()
  })

  it('will not send a pad order without the registration number or with a bad quantity', async () => {
    renderForm()
    await screen.findByText('Supplied by Pad Printers')
    await fillDoctor()
    const quantity = screen.getByDisplayValue('1')
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '0')
    await userEvent.click(screen.getByRole('button', { name: /send request/i }))

    expect(screen.getByText(/registration number -- it is printed on the pad/)).toBeInTheDocument()
    expect(screen.getByText(/Quantity must be a whole number/)).toBeInTheDocument()
    expect(createQuickGiftRequest).not.toHaveBeenCalled()
  })

  it('sends quantity and doctor details, and says the order went to the vendor when placed directly', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED' })
    renderForm()
    await screen.findByText('Supplied by Pad Printers')
    await fillDoctor()
    await userEvent.type(screen.getByPlaceholderText('e.g. MH-12345'), 'MH-12345')
    await userEvent.type(screen.getByPlaceholderText('e.g. MBBS, MD'), 'MBBS')
    const quantity = screen.getByDisplayValue('1')
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '5')
    await userEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    expect(createQuickGiftRequest.mock.calls[0][0]).toMatchObject({
      giftId: 'g-pad',
      quantity: 5,
      doctor: { registrationNumber: 'MH-12345', qualification: 'MBBS' },
    })
    expect(await screen.findByRole('heading', { name: 'My quick gifts' })).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Order placed', detail: expect.stringContaining('Pad Printers') }))
  })

  it('keeps the approval wording when the request still waits for approval', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-2', orderId: null, status: 'SUBMITTED' })
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByText('Supplied by Pad Printers')
    await fillDoctor()
    await userEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Quick Gift request sent' })))
    expect(createQuickGiftRequest.mock.calls[0][0].doctor).toBeUndefined()
  })
})
