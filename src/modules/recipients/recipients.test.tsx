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
const createMyDoctor = vi.hoisted(() => vi.fn())
const updateMyDoctor = vi.hoisted(() => vi.fn())
const removeMyDoctor = vi.hoisted(() => vi.fn())
vi.mock('@/api/recipients', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listRecipients,
  listMyRecipients,
  searchRecipients,
  createRecipient,
  listUpcomingBirthdays,
  createMyDoctor,
  updateMyDoctor,
  removeMyDoctor,
}))
const useCurrentUser = vi.hoisted(() =>
  vi.fn(() => ({ data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['doctor.view', 'doctor.create', 'doctor.edit', 'my_doctors.manage', 'quick_gift.create', 'gift_store.view'] }, isLoading: false })),
)
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

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
  for (const fn of [listRecipients, listMyRecipients, searchRecipients, createRecipient, listUpcomingBirthdays, createMyDoctor, updateMyDoctor, removeMyDoctor]) {
    fn.mockReset()
  }
  listUpcomingBirthdays.mockResolvedValue([])
})

describe('RecipientsPage', () => {
  it('lists the directory with doctor details and adds a recipient with them', async () => {
    listRecipients.mockResolvedValue([recipient()])
    createRecipient.mockResolvedValue(recipient({ id: 'r-2' }))
    renderWithProviders(<RecipientsPage />)
    const row = (await screen.findByText('Dr. Asha Shah')).closest('tr')!
    expect(within(row).getByText('MH-12345')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Add doctor/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add doctor' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add doctor' }))
    expect(within(dialog).getAllByText('Required')).toHaveLength(2)

    await userEvent.type(within(dialog).getByLabelText('Name *'), 'Dr. Ravi Rao')
    await userEvent.type(within(dialog).getByLabelText('Phone *'), '9800000002')
    await userEvent.type(within(dialog).getByLabelText('Registration no.'), 'KA-777')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add doctor' }))
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
  it('lists my doctors, narrows them as you type, and returns the ones picked', async () => {
    listMyRecipients.mockResolvedValue([recipient(), recipient({ id: 'r-2', name: 'Dr. Ravi Rao', doctor: { qualification: null, registrationNumber: 'KA-777', speciality: null, clinicName: null } })])
    const onConfirm = vi.fn()
    renderWithProviders(<RecipientPickerDialog visible onHide={() => {}} onConfirm={onConfirm} />)
    expect(await screen.findByLabelText(/Dr\. Asha Shah/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Search my doctors by name, phone or registration no.'), 'ka-777')
    expect(screen.queryByLabelText(/Dr\. Asha Shah/)).not.toBeInTheDocument()
    await userEvent.click(await screen.findByLabelText(/Dr\. Ravi Rao/))
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 selected' }))
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ id: 'r-2' })])
    expect(searchRecipients).not.toHaveBeenCalled()
  })
})

describe('MyDoctorsPage', () => {
  it('adds a doctor and removes one straight away, with no approval step', async () => {
    listMyRecipients.mockResolvedValue([recipient()])
    createMyDoctor.mockResolvedValue(recipient({ id: 'r-2' }))
    removeMyDoctor.mockResolvedValue(undefined)
    renderWithProviders(<MyDoctorsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Dr. Asha Shah' }))
    const confirm = await screen.findByRole('dialog', { name: 'Remove Dr. Asha Shah from your list?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeMyDoctor).toHaveBeenCalledWith('r-1'))

    await userEvent.click(screen.getByRole('button', { name: /Add doctor/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a doctor' })
    await userEvent.type(within(dialog).getByLabelText('Name *'), 'Dr. Meera Iyer')
    await userEvent.type(within(dialog).getByLabelText('Phone *'), '9800000003')
    await userEvent.type(within(dialog).getByLabelText('Registration no.'), 'TN-555')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add doctor' }))
    await waitFor(() =>
      expect(createMyDoctor).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Dr. Meera Iyer', doctor: expect.objectContaining({ registrationNumber: 'TN-555' }) }),
      ),
    )
  })

  it('edits a doctor starting from their current details', async () => {
    listMyRecipients.mockResolvedValue([recipient()])
    updateMyDoctor.mockResolvedValue(recipient())
    renderWithProviders(<MyDoctorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Dr. Asha Shah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Dr. Asha Shah' })
    expect(within(dialog).getByLabelText('Registration no.')).toHaveValue('MH-12345')
    expect(within(dialog).getByLabelText('Clinic / hospital')).toHaveValue('Shah Clinic')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(updateMyDoctor).toHaveBeenCalledWith('r-1', expect.objectContaining({ name: 'Dr. Asha Shah' })))
  })

  it('lists the doctors but offers no changes to someone without my_doctors.manage', async () => {
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions: ['quick_gift.create', 'gift_store.view'] }, isLoading: false })
    listMyRecipients.mockResolvedValue([recipient()])
    renderWithProviders(<MyDoctorsPage />)

    expect(await screen.findByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add doctor/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bulk upload/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Dr. Asha Shah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Dr. Asha Shah' })).not.toBeInTheDocument()
  })
})
