import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserProfile, VendorProfile } from '@/api/profile'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ProfilePage } from './ProfilePage'

const getProfile = vi.hoisted(() => vi.fn())
const updatePhone = vi.hoisted(() => vi.fn())
const changePassword = vi.hoisted(() => vi.fn())
const removePhoto = vi.hoisted(() => vi.fn())
vi.mock('@/api/profile', async (o) => ({ ...(await o<object>()), getProfile, updatePhone, changePassword, removePhoto, uploadPhoto: vi.fn() }))
vi.mock('@/hooks/use-profile', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-profile')>('@/hooks/use-profile')
  return { ...actual, useProfile: (kind: string) => actual.useProfile(kind as 'user') }
})
vi.mock('@/app/hooks', async (o) => ({ ...(await o<object>()), useAppSelector: () => true }))

const person: UserProfile = {
  name: 'Rohit Sharma',
  email: 'rohit@alembic.co.in',
  mobile: '9000000001',
  designation: 'Area Manager',
  employeeCode: '200001',
  roleName: 'AM',
  orgUnitName: 'Patna',
  managerName: 'Manish Kumar',
  companyName: 'Alembic Pharmaceuticals',
  photoUrl: null,
}
const vendor: VendorProfile = { name: 'Sky Prints', contactEmail: 'vendor@sky.in', contactPhone: '9111111111', vendorNumber: 'VID-12', photoUrl: 'https://files.test/logo.png' }

describe('ProfilePage', () => {
  beforeEach(() => {
    getProfile.mockReset().mockImplementation(async (kind: string) => (kind === 'vendor' ? vendor : person))
    updatePhone.mockReset().mockImplementation(async (_kind: string, phone: string) => ({ ...person, mobile: phone }))
    changePassword.mockReset().mockResolvedValue(undefined)
    removePhoto.mockReset().mockResolvedValue({ ...vendor, photoUrl: null })
  })

  it('shows who the person is, locked, and lets them change only the phone, the picture and the password', async () => {
    renderWithProviders(<ProfilePage kind="user" />)

    expect(await screen.findByText('Rohit Sharma')).toBeInTheDocument()
    expect(screen.getByText('rohit@alembic.co.in')).toBeInTheDocument()
    expect(screen.getByText('Manish Kumar')).toBeInTheDocument()
    expect(screen.getByText(/set by your admin/i)).toBeInTheDocument()
    // Only the phone is an input among the details; the name and email are text.
    expect(screen.getByLabelText('Mobile number')).toHaveValue('9000000001')
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
  })

  it('saves a changed phone number, and refuses one that is not a number', async () => {
    renderWithProviders(<ProfilePage kind="user" />)
    const phone = await screen.findByLabelText('Mobile number')
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()

    await userEvent.clear(phone)
    await userEvent.type(phone, 'abc')
    expect(save).toBeDisabled()
    expect(screen.getByText(/Enter a valid number/)).toBeInTheDocument()

    await userEvent.clear(phone)
    await userEvent.type(phone, '9876543210')
    await userEvent.click(save)
    await waitFor(() => expect(updatePhone).toHaveBeenCalledWith('user', '9876543210'))
  })

  it('changes the password only when it is long enough, different and confirmed', async () => {
    renderWithProviders(<ProfilePage kind="user" />)
    await userEvent.type(await screen.findByLabelText('Current password'), 'old-password')
    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('New password'))
    await userEvent.type(screen.getByLabelText('New password'), 'a-brand-new-one')
    await userEvent.clear(screen.getByLabelText('Confirm new password'))
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'something-else')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('The two passwords do not match')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('Confirm new password'))
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'a-brand-new-one')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('user', { currentPassword: 'old-password', newPassword: 'a-brand-new-one', confirmPassword: 'a-brand-new-one' }))
  })

  it('is a vendor’s own page too, with a logo and a contact phone, and the name locked', async () => {
    renderWithProviders(<ProfilePage kind="vendor" />)
    expect(await screen.findByText('VID-12')).toBeInTheDocument()
    expect(screen.getByText(/set by Wrappzo/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Contact phone')).toHaveValue('9111111111')
    expect(screen.getByText('Logo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removePhoto).toHaveBeenCalledWith('vendor'))
  })
})
