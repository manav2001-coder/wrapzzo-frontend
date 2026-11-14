import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Recipient } from '@/api/recipients'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { RecipientPickerDialog } from './RecipientPickerDialog'
import { RecipientsPage } from './RecipientsPage'

// What the server holds: the Doctors screen's rows, and the caller's own list. The API answers pages of them (/page, /mine/page).
const listRecipients = vi.hoisted(() => vi.fn())
const listMyRecipients = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const searchRecipients = vi.hoisted(() => vi.fn())
const updateRecipient = vi.hoisted(() => vi.fn())
const createMyDoctor = vi.hoisted(() => vi.fn())
const removeMyDoctor = vi.hoisted(() => vi.fn())
vi.mock('@/api/recipients', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchRecipients,
  updateRecipient,
  createMyDoctor,
  removeMyDoctor,
}))
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

/** What an AM or MR holds for doctors: the whole set, on their own list. */
const FIELD_STAFF = ['doctor.view', 'doctor.create', 'doctor.edit', 'doctor.remove', 'doctor.import', 'quick_gift.create', 'gift_store.view']

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

function recipient(overrides: Partial<Recipient> = {}): Recipient {
  return {
    id: 'r-1',
    name: 'Dr. Asha Shah',
    phone: '9800000001',
    pcode: 'P-1001',
    email: null,
    address: null,
    dateOfBirth: null,
    doctor: { qualification: 'MBBS', speciality: 'Cardiology', clinicName: 'Shah Clinic' },
    createdByName: 'Rahul',
    createdAt: '2026-10-01T00:00:00Z',
    inMyList: true,
    ...overrides,
  }
}

function pageOf(rows: Recipient[]) {
  return { data: { data: rows, total: rows.length, page: 0, pageSize: 20, hasMore: false } }
}

beforeEach(() => {
  get.mockReset().mockImplementation(async (url: string, config?: { params?: { search?: string } }) => {
    if (url === '/api/recipients/page') return pageOf(await listRecipients())
    if (url === '/api/recipients/mine/page') {
      const needle = config?.params?.search?.toLowerCase()
      const mine = (await listMyRecipients()) as Recipient[]
      return pageOf(needle ? mine.filter((r) => [r.name, r.pcode].some((v) => v?.toLowerCase().includes(needle))) : mine)
    }
    return { data: [] }
  })
  for (const fn of [listRecipients, listMyRecipients, searchRecipients, updateRecipient, createMyDoctor, removeMyDoctor]) {
    fn.mockReset()
  }
  signedInWith(FIELD_STAFF)
})

describe('Doctors page', () => {
  it('lists the doctors with their details and adds one', async () => {
    listRecipients.mockResolvedValue([recipient()])
    createMyDoctor.mockResolvedValue(recipient({ id: 'r-2' }))
    renderWithProviders(<RecipientsPage />)
    const row = (await screen.findByText('Dr. Asha Shah')).closest('tr')!
    expect(within(row).getByText('P-1001')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Add doctor/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add doctor' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add doctor' }))
    expect(within(dialog).getAllByText('Required')).toHaveLength(3)

    await userEvent.type(within(dialog).getByLabelText('Pcode *'), 'P-2002')
    await userEvent.type(within(dialog).getByLabelText('Name *'), 'Dr. Ravi Rao')
    await userEvent.type(within(dialog).getByLabelText('Phone *'), '9800000002')
    await userEvent.type(within(dialog).getByLabelText('Speciality'), 'Cardiology')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add doctor' }))
    await waitFor(() =>
      expect(createMyDoctor).toHaveBeenCalledWith(
        expect.objectContaining({ pcode: 'P-2002', name: 'Dr. Ravi Rao', doctor: expect.objectContaining({ speciality: 'Cardiology' }) }),
      ),
    )
  })

  it('edits a doctor starting from their current details', async () => {
    listRecipients.mockResolvedValue([recipient()])
    updateRecipient.mockResolvedValue(recipient())
    renderWithProviders(<RecipientsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Dr. Asha Shah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit doctor' })
    expect(within(dialog).getByLabelText('Pcode *')).toHaveValue('P-1001')
    expect(within(dialog).getByLabelText('Clinic / hospital')).toHaveValue('Shah Clinic')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(updateRecipient).toHaveBeenCalledWith('r-1', expect.objectContaining({ name: 'Dr. Asha Shah' })))
  })

  it('removes a doctor from your own list straight away, and only offers it for doctors on that list', async () => {
    listRecipients.mockResolvedValue([recipient(), recipient({ id: 'r-2', name: 'Dr. Ravi Rao', phone: '9800000002', inMyList: false })])
    removeMyDoctor.mockResolvedValue(undefined)
    renderWithProviders(<RecipientsPage />)

    expect(await screen.findByText('Dr. Ravi Rao')).toBeInTheDocument()
    // A manager sees their team's doctors; those are not theirs to remove.
    expect(screen.queryByRole('button', { name: 'Remove Dr. Ravi Rao' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Dr. Ravi Rao' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Dr. Asha Shah' }))
    const confirm = await screen.findByRole('dialog', { name: 'Remove Dr. Asha Shah from your list?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeMyDoctor).toHaveBeenCalledWith('r-1'))
  })

  it('offers bulk upload to someone who may import', async () => {
    listRecipients.mockResolvedValue([recipient()])
    renderWithProviders(<RecipientsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Bulk upload/ }))
    expect(await screen.findByRole('dialog', { name: 'Upload doctors' })).toBeInTheDocument()
  })

  it('lists the doctors but offers no changes to someone who may only view them', async () => {
    signedInWith(['doctor.view'])
    listRecipients.mockResolvedValue([recipient()])
    renderWithProviders(<RecipientsPage />)

    expect(await screen.findByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add doctor/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bulk upload/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Dr. Asha Shah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Dr. Asha Shah' })).not.toBeInTheDocument()
  })

})

describe('RecipientPickerDialog', () => {
  it('lists my doctors, narrows them as you type, and returns the ones picked', async () => {
    listMyRecipients.mockResolvedValue([recipient(), recipient({ id: 'r-2', name: 'Dr. Ravi Rao', pcode: 'P-2002', doctor: { qualification: null, speciality: null, clinicName: null } })])
    const onConfirm = vi.fn()
    renderWithProviders(<RecipientPickerDialog visible onHide={() => {}} onConfirm={onConfirm} />)
    expect(await screen.findByLabelText(/Dr\. Asha Shah/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Search my doctors by pcode, name or phone'), 'p-2002')
    expect(screen.queryByLabelText(/Dr\. Asha Shah/)).not.toBeInTheDocument()
    await userEvent.click(await screen.findByLabelText(/Dr\. Ravi Rao/))
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 selected' }))
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ id: 'r-2' })])
    expect(searchRecipients).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledWith('/api/recipients/mine/page', { params: expect.objectContaining({ search: 'p-2002', size: 20 }) })
  })
})
