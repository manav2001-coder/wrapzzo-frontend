import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyUser } from '@/api/users'
import { renderWithProviders, screen } from '@/test/test-utils'
import { CompanyUsersPage } from './CompanyUsersPage'

vi.mock('@/hooks/use-is-mobile', () => ({ useIsMobile: () => true }))

const person: CompanyUser = {
  id: 'u-1',
  name: 'Priya',
  email: 'priya@alembic.in',
  mobile: null,
  designation: 'Manager',
  employeeCode: 'E-7',
  status: 'ACTIVE',
  reportsToName: null,
  orgUnitId: 'north',
  orgUnitName: 'North',
  companyWide: false,
  extraOrgUnits: [],
  roleId: 'r-1',
  roleName: 'Member',
  createdAt: '2026-10-01T00:00:00Z',
}

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', async (o) => ({ ...(await o<object>()), apiClient: { get } }))
const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-current-user')>()),
  useCurrentUser: currentUser,
}))

describe('CompanyUsersPage on a phone', () => {
  beforeEach(() => {
    currentUser.mockReturnValue({
      data: { companyId: 'c1', companyName: 'Alembic', permissions: ['user.view', 'user.delete'], companyWide: false, managesTeam: false },
      isLoading: false,
    })
    get.mockReset().mockResolvedValue({ data: { data: [person], total: 1, page: 0, pageSize: 25, hasMore: false } })
  })

  it('shows each person as a compact card with their details and actions', async () => {
    renderWithProviders(<CompanyUsersPage />)
    expect(await screen.findByText('Priya')).toBeInTheDocument()
    expect(screen.getByText('priya@alembic.in')).toBeInTheDocument()
    expect(screen.getByText('Manager · E-7')).toBeInTheDocument()
    expect(screen.getByText('North')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })
})
