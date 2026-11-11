import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Gift } from '@/api/gifts'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { QuickGiftFormPage } from './QuickGiftFormPage'

const listActiveGifts = vi.hoisted(() => vi.fn())
const createQuickGiftRequest = vi.hoisted(() => vi.fn())
const uploadQuickGiftPhoto = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/api/gifts', async (importOriginal) => ({ ...(await importOriginal<object>()), listActiveGifts }))
vi.mock('@/api/quickGifts', async (importOriginal) => ({ ...(await importOriginal<object>()), createQuickGiftRequest, uploadQuickGiftPhoto }))
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
  await userEvent.type(screen.getByLabelText('Pcode *'), 'P-1001')
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
    uploadQuickGiftPhoto.mockReset()
    createQuickGiftRequest.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it('names the gift and its vendor, and asks for the pcode and the doctor details a pad is printed with', async () => {
    renderForm()
    expect(await screen.findByRole('heading', { name: 'Send Prescription Pad' })).toBeInTheDocument()
    expect(screen.getByText('Supplied by Pad Printers')).toBeInTheDocument()
    expect(screen.getByLabelText('Pcode *')).toBeInTheDocument()
    expect(screen.getByLabelText('Qualification')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity *')).toHaveValue('1')
  })

  it('hides the doctor details for a gift that is not personalised', async () => {
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    expect(screen.queryByLabelText('Qualification')).not.toBeInTheDocument()
    // The pcode identifies the doctor whatever the gift.
    expect(screen.getByLabelText('Pcode *')).toBeInTheDocument()
  })

  it('will not send without the required fields or a valid quantity', async () => {
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await setQuantity('0')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getAllByText('Required')).toHaveLength(4)
    expect(screen.getByText(/Enter a whole number from 1 to/)).toBeInTheDocument()
    expect(createQuickGiftRequest).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Fix the highlighted recipients')
  })

  it('sends quantity and print details, and says the order went to the vendor when placed directly', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED' })
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await userEvent.type(screen.getByLabelText('Qualification'), 'MBBS')
    await setQuantity('5')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    expect(createQuickGiftRequest.mock.calls[0][0]).toMatchObject({
      giftId: 'g-pad',
      recipientPcode: 'P-1001',
      recipientName: 'Dr. Asha Shah',
      deliveryAddress: '12 MG Road, Pune',
      quantity: 5,
      doctor: { qualification: 'MBBS' },
    })
    expect(await screen.findByRole('heading', { name: 'My quick gifts' })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Order placed', { description: expect.stringContaining('Pad Printers') })
  })

  it('has one note, for the vendor -- no gift message and no internal notes to tell apart', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED' })
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })

    expect(screen.getAllByRole('textbox', { name: /note/i })).toHaveLength(1)
    expect(screen.getByLabelText('Note for the vendor')).toBeInTheDocument()
    expect(screen.queryByLabelText(/gift message/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/internal notes/i)).not.toBeInTheDocument()

    await fillRecipient()
    await userEvent.type(screen.getByLabelText('Note for the vendor'), 'Also print "Clinic hours 10-6" at the bottom')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    const sent = createQuickGiftRequest.mock.calls[0][0]
    expect(sent.giftMessage).toBe('Also print "Clinic hours 10-6" at the bottom')
    expect(sent).not.toHaveProperty('internalNotes')
  })

  it('says the order was sent for approval, not to the vendor, when it is held for the approver', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED', orderApprovalStatus: 'PENDING' })
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('heading', { name: 'My quick gifts' })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Order sent for approval', { description: expect.stringContaining('once your approver approves') })
    expect(toast.success).not.toHaveBeenCalledWith('Order placed', expect.anything())
  })

  it('uploads every photo picked, numbered in the order picked, and sends them all with the order', async () => {
    uploadQuickGiftPhoto.mockImplementation(async (file: File, _pcode: string, number: number) => ({ key: `k/${number}`, fileName: file.name, contentType: file.type }))
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED' })
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!
    const cover = new File(['a'], 'cover.png', { type: 'image/png' })
    const inside = new File(['b'], 'inside.png', { type: 'image/png' })
    await userEvent.upload(input, [cover, inside])
    expect(screen.getByText('cover.png')).toBeInTheDocument()
    expect(screen.getByText('inside.png')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    expect(uploadQuickGiftPhoto).toHaveBeenNthCalledWith(1, cover, 'P-1001', 1)
    expect(uploadQuickGiftPhoto).toHaveBeenNthCalledWith(2, inside, 'P-1001', 2)
    expect(createQuickGiftRequest.mock.calls[0][0].photos).toHaveLength(2)
  })

  it('lets a picked photo be taken out again', async () => {
    renderForm()
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type=file]')!, [new File(['a'], 'cover.png', { type: 'image/png' }), new File(['b'], 'inside.png', { type: 'image/png' })])
    await userEvent.click(screen.getByRole('button', { name: 'Remove cover.png' }))
    expect(screen.queryByText('cover.png')).not.toBeInTheDocument()
    expect(screen.getByText('inside.png')).toBeInTheDocument()
  })

  it("holds the quantity to the vendor's minimum order", async () => {
    renderForm({ ...PAD, moq: 50 })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    expect(screen.getByText('Minimum order: 50')).toBeInTheDocument()
    await fillRecipient()
    await setQuantity('5')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByText(/Enter a whole number from 50 to/)).toBeInTheDocument()
    expect(createQuickGiftRequest).not.toHaveBeenCalled()
  })

  it('sends the picked doctor as recipientId, and drops the link once their details are edited', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-1', orderId: 'o-1', status: 'APPROVED' })
    const doctor = {
      id: 'r-1',
      name: 'Dr. Asha Shah',
      phone: '9800000001',
      pcode: 'P-1001',
      email: null,
      address: '12 MG Road, Pune',
      dateOfBirth: null,
      doctor: { qualification: 'MBBS', speciality: null, clinicName: null },
    }
    listActiveGifts.mockResolvedValue([PAD])
    const view = renderWithProviders(
      <Routes>
        <Route path="/quick-gift/new/:giftId" element={<QuickGiftFormPage />} />
        <Route path="/quick-gift" element={<h1>My quick gifts</h1>} />
      </Routes>,
      { route: { pathname: `/quick-gift/new/${PAD.id}`, state: { prefillRecipient: doctor } } },
    )
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    expect(createQuickGiftRequest.mock.calls[0][0]).toMatchObject({ recipientId: 'r-1', recipientName: 'Dr. Asha Shah' })
    view.unmount()

    createQuickGiftRequest.mockClear()
    renderWithProviders(
      <Routes>
        <Route path="/quick-gift/new/:giftId" element={<QuickGiftFormPage />} />
        <Route path="/quick-gift" element={<h1>My quick gifts</h1>} />
      </Routes>,
      { route: { pathname: `/quick-gift/new/${PAD.id}`, state: { prefillRecipient: doctor } } },
    )
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await userEvent.type(screen.getByLabelText('Delivery address *'), ', Clinic gate')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createQuickGiftRequest).toHaveBeenCalledTimes(1))
    expect(createQuickGiftRequest.mock.calls[0][0].recipientId).toBeUndefined()
    expect(createQuickGiftRequest.mock.calls[0][0].deliveryAddress).toBe('12 MG Road, Pune, Clinic gate')
  })

  it('keeps the approval wording when requests still wait for approval, one per recipient', async () => {
    createQuickGiftRequest.mockResolvedValue({ id: 'q-2', orderId: null, status: 'SUBMITTED' })
    renderForm({ ...PAD, artworkRequired: false })
    await screen.findByRole('heading', { name: 'Send Prescription Pad' })
    await fillRecipient()
    await userEvent.click(screen.getByRole('button', { name: 'Add recipient' }))
    const names = screen.getAllByLabelText('Name *')
    await userEvent.type(screen.getAllByLabelText('Pcode *')[1], 'P-2002')
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
    await userEvent.type(screen.getAllByLabelText('Pcode *')[1], 'P-2002')
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
