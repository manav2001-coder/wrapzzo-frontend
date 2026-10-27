import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Gift } from '@/api/gifts'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { QuickGiftFormPage } from './QuickGiftFormPage'

const listActiveGifts = vi.hoisted(() => vi.fn())
const createQuickGiftRequest = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/api/gifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listActiveGifts }))
vi.mock('@/api/quickGifts', async (importOriginal) => ({ ...(await importOriginal<object>()), createQuickGiftRequest }))
const createRecurringOrderPlan = vi.hoisted(() => vi.fn())
vi.mock('@/api/recurringOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), createRecurringOrderPlan }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<object>()), toast }))

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

async function fillRecipient() {
  await userEvent.type(screen.getByLabelText('Name *'), 'Dr. Asha Shah')
  await userEvent.type(screen.getByLabelText('Phone *'), '9800000001')
  await userEvent.type(screen.getByLabelText('Delivery address *'), '12 MG Road, Pune')
}

async function setQuantity(value: string) {
  const quantity = screen.getByLabelText('Quantity *')
  await userEvent.clear(quantity)
  if (value) await userEvent.type(quantity, value)
}

describe('QuickGiftFormPage', () => {
  beforeEach(() => {
    listActiveGifts.mockReset()
    createQuickGiftRequest.mockReset()
    createRecurringOrderPlan.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it('names the gift and its vendor, and asks for the doctor details a pad is printed with', async () => {
    renderForm()
    expect(await screen.findByRole('heading', { name: 'Send Prescription Pad' })).toBeInTheDocument()
    expect(screen.getByText('Supplied by Pad Printers')).toBeInTheDocument()
    expect(screen.getByLabelText('Registration no. *')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity *')).toHaveValue('1')
  })

  it('hides the doctor details for a gift that is not personalised', async () => {
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    expect(screen.queryByLabelText('Registration no. *')).not.toBeInTheDocument()
  })

  it('will not send without the required fields, the registration number or a valid quantity', async () => {
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await setQuantity('0')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getAllByText('Required')).toHaveLength(3)
    expect(screen.getByText("The doctor's registration number is printed on the pad.")).toBeInTheDocument()
    expect(screen.getByText(/Enter a whole number from 1 to/)).toBeInTheDocument()
    expect(createQuickGiftRequest).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Fix the highlighted recipients')
  })

  it('sends quantity and print details, and says the order went to the vendor when placed directly', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED' })
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await userEvent.type(screen.getByLabelText('Registration no. *'), 'MH-12345')
    await userEvent.type(screen.getByLabelText('Qualification'), 'MBBS')
    await setQuantity('5')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    expect(createQuickGiftRequest.mock.calls[0][0]).toMatchObject({
      giftId: 'g-pad',
      recipientName: 'Dr. Asha Shah',
      deliveryAddress: '12 MG Road, Pune',
      quantity: 5,
      doctor: { registrationNumber: 'MH-12345', qualification: 'MBBS' },
    })
    expect(await screen.findByRole('heading', { name: 'My quick gifts' })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Order placed', { description: expect.stringContaining('Pad Printers') })
  })

  it('sets up a monthly order instead of a one-off when "Repeat every month" is ticked', async () => {
    createRecurringOrderPlan.mockResolvedValue({ id: 'p-1', status: 'ACTIVE' })
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await setQuantity('200')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Repeat every month' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createRecurringOrderPlan).toHaveBeenCalledTimes(1))
    expect(createRecurringOrderPlan.mock.calls[0][0]).toMatchObject({ giftId: 'g-pad', recipientName: 'Dr. Asha Shah', quantity: 200 })
    expect(createQuickGiftRequest).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Monthly order set up', {
      description: 'The first order went out now. The same order goes out again every month.',
    })
  })

  it('keeps the approval wording when requests still wait for approval, one per recipient', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-2', orderId: null, status: 'SUBMITTED' })
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await userEvent.click(screen.getByRole('button', { name: 'Add recipient' }))
    const names = screen.getAllByLabelText('Name *')
    await userEvent.type(names[1], 'Dr. Ravi Rao')
    await userEvent.type(screen.getAllByLabelText('Phone *')[1], '9800000002')
    await userEvent.type(screen.getAllByLabelText('Delivery address *')[1], '4 Park St, Kolkata')
    await userEvent.click(screen.getByRole('button', { name: 'Send all 2' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 Quick Gift requests sent', { description: 'Sent for approval.' }))
    expect(createQuickGiftRequest).toHaveBeenCalledTimes(2)
    expect(createQuickGiftRequest.mock.calls[0][0].doctor).toBeUndefined()
  })

  it('keeps a failed recipient on the form with the reason, and drops the ones that went through', async () => {
    createQuickGiftRequest.mockResolvedValueOnce({ id: 'q-3', orderId: null }).mockRejectedValueOnce(new Error('Gift is out of stock'))
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await userEvent.click(screen.getByRole('button', { name: 'Add recipient' }))
    await userEvent.type(screen.getAllByLabelText('Name *')[1], 'Dr. Ravi Rao')
    await userEvent.type(screen.getAllByLabelText('Phone *')[1], '9800000002')
    await userEvent.type(screen.getAllByLabelText('Delivery address *')[1], '4 Park St, Kolkata')
    await userEvent.click(screen.getByRole('button', { name: 'Send all 2' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Gift is out of stock')
    expect(screen.getAllByLabelText('Name *')).toHaveLength(1)
    expect(screen.getByLabelText('Name *')).toHaveValue('Dr. Ravi Rao')
    expect(toast.error).toHaveBeenCalledWith('1 sent, 1 failed. The failed ones are still below.')
  })

  it('explains when the gift is not available to the user', async () => {
    listActiveGifts.mockResolvedValue([])
    renderWithProviders(
      <Routes>
        <Route path="/quick-gift/new/:giftId" element={<QuickGiftFormPage />} />
      </Routes>,
      { route: '/quick-gift/new/missing' },
    )
    expect(await screen.findByText('Gift not available')).toBeInTheDocument()
  })
})
