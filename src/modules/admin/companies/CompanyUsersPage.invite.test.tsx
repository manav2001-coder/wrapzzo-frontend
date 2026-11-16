import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyUser } from '@/api/users'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { CompanyUsersPage } from './CompanyUsersPage'

const user = (id: string, name: string, extra: Partial<CompanyUser> = {}): CompanyUser => ({
  id,
  name,
  email: `${id}@alembic.in`,
  mobile: null,
  designation: 'Area Manager',
  employeeCode: null,
  status: 'ACTIVE',
  reportsToName: null,
  orgUnitId: 'north',
  orgUnitName: 'North',
  companyWide: false,
  extraOrgUnits: [],
  roleId: 'r-1',
  roleName: 'AM',
  createdAt: '2026-10-01T00:00:00Z',
  ...extra,
})

const get = vi.hoisted(() => vi.fn())
const resendInvite = vi.hoisted(() => vi.fn())
const getSetupLink = vi.hoisted(() => vi.fn())
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), resendInvite, getSetupLink }))
vi.mock('@/lib/axiosClient', async (o) => ({ ...(await o<object>()), apiClient: { get } }))
const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/hooks/use-current-user')>()), useCurrentUser: currentUser }))

function signedInAs(permissions: string[], companyWide: boolean) {
  currentUser.mockReturnValue({ data: { companyId: 'c1', companyName: 'Alembic', permissions, companyWide, managesTeam: false }, isLoading: false })
}
const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement

describe('CompanyUsersPage -- resend invite and copy setup link', () => {
  beforeEach(() => {
    get.mockReset().mockImplementation(async (url: string) => {
      if (url === '/api/platform/companies/c1/users/page') {
        const rows = [user('u-1', 'Santosh', { status: 'INVITED' }), user('u-2', 'Neha', { status: 'ACTIVE' })]
        return { data: { data: rows, total: rows.length, page: 0, pageSize: 25, hasMore: false } }
      }
      return { data: [] }
    })
    resendInvite.mockReset().mockResolvedValue(undefined)
    getSetupLink.mockReset().mockResolvedValue({ setupUrl: 'https://workspace.wrappzo.com/setup-password?token=abc', expiresAt: '2026-11-23T00:00:00Z' })
  })

  it('resends to someone who has not set up, after saying the old link stops working', async () => {
    signedInAs(['user.view', 'user.edit'], false)
    renderWithProviders(<CompanyUsersPage />)
    await userEvent.click(within(await rowOf('Santosh')).getByRole('button', { name: 'Resend invite' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/old link|sent before stops working/i)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Resend invite' }))
    await waitFor(() => expect(resendInvite).toHaveBeenCalledWith('c1', 'u-1'))
  })

  it('keeps the button in the table for someone already set up, but greyed out', async () => {
    signedInAs(['user.view', 'user.edit'], false)
    renderWithProviders(<CompanyUsersPage />)
    const button = within(await rowOf('Neha')).getByRole('button', { name: 'Resend invite' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(resendInvite).not.toHaveBeenCalled()
  })

  it('offers neither to someone who cannot edit users', async () => {
    signedInAs(['user.view'], true)
    renderWithProviders(<CompanyUsersPage />)
    await rowOf('Santosh')
    expect(screen.queryByRole('button', { name: 'Resend invite' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy setup link' })).not.toBeInTheDocument()
  })

  it('copies a setup link, only for someone who sees the whole company and only for someone not yet set up', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    signedInAs(['user.view', 'user.edit'], true)
    renderWithProviders(<CompanyUsersPage />)

    expect(within(await rowOf('Neha')).queryByRole('button', { name: 'Copy setup link' })).not.toBeInTheDocument()
    await userEvent.click(within(await rowOf('Santosh')).getByRole('button', { name: 'Copy setup link' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Copy setup link' }))

    await waitFor(() => expect(getSetupLink).toHaveBeenCalledWith('c1', 'u-1'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://workspace.wrappzo.com/setup-password?token=abc'))
  })

  it('does not offer the link to a user who edits users but does not see the whole company', async () => {
    signedInAs(['user.view', 'user.edit'], false)
    renderWithProviders(<CompanyUsersPage />)
    await rowOf('Santosh')
    expect(screen.queryByRole('button', { name: 'Copy setup link' })).not.toBeInTheDocument()
  })

  it('shows the link to copy by hand when the browser will not copy it', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) }, configurable: true })
    signedInAs(['user.view', 'user.edit'], true)
    renderWithProviders(<CompanyUsersPage />)
    await userEvent.click(within(await rowOf('Santosh')).getByRole('button', { name: 'Copy setup link' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Copy setup link' }))
    expect(await screen.findByDisplayValue('https://workspace.wrappzo.com/setup-password?token=abc')).toBeInTheDocument()
  })
})
