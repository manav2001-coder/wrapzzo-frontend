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
  designation: 'Manager',
  employeeCode: null,
  status: 'ACTIVE',
  reportsToName: null,
  orgUnitId: 'north',
  orgUnitName: 'North',
  companyWide: false,
  extraOrgUnits: [],
  roleId: 'r-1',
  roleName: 'Member',
  createdAt: '2026-10-01T00:00:00Z',
  ...extra,
})

const listCompanyUsers = vi.hoisted(() => vi.fn())
const setCompanyWide = vi.hoisted(() => vi.fn())
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), listCompanyUsers, setCompanyWide }))
const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-current-user')>()),
  useCurrentUser: currentUser,
}))

function signedInAs(permissions: string[], companyWide: boolean) {
  currentUser.mockReturnValue({ data: { companyId: 'c1', companyName: 'Alembic', permissions, companyWide, managesTeam: false }, isLoading: false })
}

const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr') as HTMLElement

describe('CompanyUsersPage -- who sees what', () => {
  beforeEach(() => {
    listCompanyUsers.mockResolvedValue([user('u-1', 'Priya'), user('u-2', 'Neha', { companyWide: true, orgUnitId: null, orgUnitName: null })])
    setCompanyWide.mockReset()
  })

  it('badges company-wide users in place of a unit', async () => {
    signedInAs(['user.view'], false)
    renderWithProviders(<CompanyUsersPage />)
    expect(within(await rowOf('Neha')).getByText('Whole company')).toBeInTheDocument()
    expect(within(await rowOf('Priya')).getByText('North')).toBeInTheDocument()
  })

  it('places someone at the whole company, for a user who sees it themselves', async () => {
    signedInAs(['user.view', 'user.edit'], true)
    setCompanyWide.mockResolvedValue(user('u-1', 'Priya', { companyWide: true }))
    renderWithProviders(<CompanyUsersPage />)
    await userEvent.click(within(await rowOf('Priya')).getByRole('button', { name: 'See whole company' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'See whole company' }))
    await waitFor(() => expect(setCompanyWide).toHaveBeenCalledWith('c1', 'u-1', true))
    expect(within(await rowOf('Neha')).getByRole('button', { name: 'Back to own unit' })).toBeInTheDocument()
  })

  it("hides placement controls from someone who doesn't see the whole company, even with user.edit", async () => {
    signedInAs(['user.view', 'user.edit', 'user.delete'], false)
    renderWithProviders(<CompanyUsersPage />)
    const priya = await rowOf('Priya')
    expect(within(priya).queryByRole('button', { name: 'See whole company' })).not.toBeInTheDocument()
    expect(within(priya).queryByRole('button', { name: 'Make Company Admin' })).not.toBeInTheDocument()
    expect(within(priya).getByRole('button', { name: 'Delete user' })).toBeInTheDocument()
  })

  it('offers adding and importing only with user.create', async () => {
    signedInAs(['user.view'], true)
    renderWithProviders(<CompanyUsersPage />)
    await rowOf('Priya')
    expect(screen.queryByRole('button', { name: 'Add users' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import employees' })).not.toBeInTheDocument()
  })
})
