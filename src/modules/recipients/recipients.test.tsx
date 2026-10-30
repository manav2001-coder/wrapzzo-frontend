import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Recipient } from '@/api/recipients'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { MyDoctorsPage } from './MyDoctorsPage'
import { RecipientPickerDialog } from './RecipientPickerDialog'
import { RecipientsPage } from './RecipientsPage'

const listRecipients = vi.hoisted(() => vi.fn())
const listMyRecipients = vi.hoisted(() => vi.fn())
const searchRecipients = vi.hoisted(() => vi.fn())
const createRecipient = vi.hoisted(() => vi.fn())
const listUpcomingBirthdays = vi.hoisted(() => vi.fn())
const listMyDoctorChangeRequests = vi.hoisted(() => vi.fn())
const createDoctorChangeRequest = vi.hoisted(() => vi.fn())
vi.mock('@/api/recipients', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listRecipients,
  listMyRecipients,
  searchRecipients,
  createRecipient,
  listUpcomingBirthdays,
}))
const useCurrentUser = vi.hoisted(() =>
  vi.fn(() => ({ data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['recipient.view', 'recipient.create', 'recipient.edit', 'recipient_list.manage', 'request.create', 'product.view'] }, isLoading: false })),
)
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))
vi.mock('@/api/doctorRequests', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listMyDoctorChangeRequests,
  createDoctorChangeRequest,
}))

function recipient(overrides: Partial<Recipient> = {}): Recipient {
  return {
    id: 'r-1',
    name: 'Dr. Asha Shah',
    phone: '9800000001',
    email: null,
    address: null,
    dateOfBirth: null,
    doctor: { qualification: 'MBBS', registrationNumber: 'MH-12345', speciality: 'Cardiology', clinicName: 'Shah Clinic' },
    createdByName: 'Rahul',
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  for (const fn of [listRecipients, listMyRecipients, searchRecipients, createRecipient, listUpcomingBirthdays, listMyDoctorChangeRequests, createDoctorChangeRequest]) {
    fn.mockReset()
  }
  listUpcomingBirthdays.mockResolvedValue([])
  listMyDoctorChangeRequests.mockResolvedValue([])
})

describe('RecipientsPage', () => {
  it('lists the directory with doctor details and adds a recipient with them', async () => {
    listRecipients.mockResolvedValue([recipient()])
    createRecipient.mockResolvedValue(recipient({ id: 'r-2' }))
    renderWithProviders(<RecipientsPage />)
    const row = (await screen.findByText('Dr. Asha Shah')).closest('tr')!
    expect(within(row).getByText('MH-12345')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Add recipient/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add recipient' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add recipient' }))
    expect(within(dialog).getAllByText('Required')).toHaveLength(2)

    await userEvent.type(within(dialog).getByLabelText('Name *'), 'Dr. Ravi Rao')
    await userEvent.type(within(dialog).getByLabelText('Phone *'), '9800000002')
    await userEvent.type(within(dialog).getByLabelText('Registration no.'), 'KA-777')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add recipient' }))
    await waitFor(() =>
      expect(createRecipient).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Dr. Ravi Rao', doctor: expect.objectContaining({ registrationNumber: 'KA-777' }) }),
      ),
    )
  })

  it('offers a Quick Gift for an upcoming birthday', async () => {
    listRecipients.mockResolvedValue([])
    listUpcomingBirthdays.mockResolvedValue([{ id: 'r-1', name: 'Dr. Asha Shah', phone: '1', email: null, address: null, dateOfBirth: '1980-10-28', daysUntilBirthday: 1 }])
    renderWithProviders(<RecipientsPage />)
    expect(await screen.findByText('Upcoming birthdays')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send a gift/ })).toBeInTheDocument()
  })
})

describe('RecipientPickerDialog', () => {
  it('searches and returns the recipients picked', async () => {
    searchRecipients.mockResolvedValue([recipient(), recipient({ id: 'r-2', name: 'Dr. Ravi Rao' })])
    const onConfirm = vi.fn()
    renderWithProviders(<RecipientPickerDialog visible onHide={() => {}} onConfirm={onConfirm} />)
    expect(screen.getByText('Start typing to search')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Search by name, phone or registration no.'), 'dr')
    await userEvent.click(await screen.findByLabelText(/Dr\. Ravi Rao/))
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 selected' }))
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ id: 'r-2' })])
  })
})

describe('MyDoctorsPage', () => {
  it('files add and removal requests for the manager to approve, and lists the pending ones', async () => {
    listMyRecipients.mockResolvedValue([recipient()])
    listMyDoctorChangeRequests.mockResolvedValue([
      { id: 'q-1', action: 'ADD', proposedName: 'Dr. New', recipientName: null, status: 'PENDING', createdAt: '2026-10-20T10:00:00Z' },
    ])
    createDoctorChangeRequest.mockResolvedValue({})
    renderWithProviders(<MyDoctorsPage />)

    expect(await screen.findByText('Waiting for your manager')).toBeInTheDocument()
    expect(screen.getByText('Dr. New', { exact: false })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Request removal of Dr. Asha Shah' }))
    const confirm = await screen.findByRole('dialog', { name: 'Remove Dr. Asha Shah from your list?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Request removal' }))
    await waitFor(() => expect(createDoctorChangeRequest).toHaveBeenCalledWith({ action: 'REMOVE', recipientId: 'r-1' }))

    await userEvent.click(screen.getByRole('button', { name: /Request new doctor/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Request a new doctor' })
    expect(within(dialog).getByRole('button', { name: 'Send for approval' })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Doctor name *'), 'Dr. Meera Iyer')
    await userEvent.type(within(dialog).getByLabelText('Phone *'), '9800000003')
    await userEvent.type(within(dialog).getByLabelText('Registration no.'), 'TN-555')
    await userEvent.type(within(dialog).getByLabelText('Speciality'), 'Paediatrics')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send for approval' }))
    await waitFor(() =>
      expect(createDoctorChangeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADD',
          proposedName: 'Dr. Meera Iyer',
          proposedDoctor: { registrationNumber: 'TN-555', speciality: 'Paediatrics', qualification: null, clinicName: null },
        }),
      ),
    )
  })

  it('starts a change request from the doctor’s current print details', async () => {
    listMyRecipients.mockResolvedValue([recipient()])
    renderWithProviders(<MyDoctorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Request changes to Dr. Asha Shah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Request changes to Dr. Asha Shah' })
    expect(within(dialog).getByLabelText('Registration no.')).toHaveValue('MH-12345')
    expect(within(dialog).getByLabelText('Clinic / hospital')).toHaveValue('Shah Clinic')
  })
})
