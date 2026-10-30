import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { renderWithProviders, screen, within } from '@/test/test-utils'
import { CompanyListPage } from './CompanyListPage'

const api = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  activateCompany: vi.fn(),
  deactivateCompany: vi.fn(),
}))
vi.mock('@/api/companies', () => api)

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ data: { companyId: null, companyName: null, permissions: ['platform_company.view', 'platform_company.create', 'platform_company.edit', 'platform_company.status', 'platform_company.configure'] }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

const ACME = { id: 'c1', displayId: 'CID-1', name: 'Acme Pharma', status: 'ACTIVE', logoUrl: null, createdAt: '2026-08-21T10:00:00Z' }
const ZENITH = { ...ACME, id: 'c2', displayId: 'CID-2', name: 'Zenith Healthcare', status: 'INACTIVE' }

function renderList() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/companies" element={<CompanyListPage />} />
      <Route path="/admin/companies/new" element={<h1>New company</h1>} />
      <Route path="/admin/companies/:id/users" element={<h1>Company users</h1>} />
    </Routes>,
    { route: '/admin/companies' },
  )
}

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('CompanyListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listCompanies.mockResolvedValue([ACME, ZENITH])
  })

  it('lists every company with its status', async () => {
    renderList()
    expect(await screen.findByText('Acme Pharma')).toBeInTheDocument()
    expect(within(rowOf('Acme Pharma')).getByText('Active')).toBeInTheDocument()
    expect(within(rowOf('Zenith Healthcare')).getByText('Inactive')).toBeInTheDocument()
  })

  it('deactivates only after the confirm', async () => {
    api.deactivateCompany.mockResolvedValue({ ...ACME, status: 'INACTIVE' })
    renderList()
    await screen.findByText('Acme Pharma')
    await userEvent.click(within(rowOf('Acme Pharma')).getByRole('button', { name: 'Deactivate' }))
    expect(api.deactivateCompany).not.toHaveBeenCalled()

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }))
    expect(api.deactivateCompany).toHaveBeenCalledWith('c1')
  })

  it('activates an inactive company straight from its row', async () => {
    api.activateCompany.mockResolvedValue({ ...ZENITH, status: 'ACTIVE' })
    renderList()
    await screen.findByText('Zenith Healthcare')
    await userEvent.click(within(rowOf('Zenith Healthcare')).getByRole('button', { name: 'Activate' }))
    expect(api.activateCompany).toHaveBeenCalledWith('c2')
  })

  it("opens a company's users", async () => {
    renderList()
    await screen.findByText('Acme Pharma')
    await userEvent.click(within(rowOf('Acme Pharma')).getByRole('button', { name: 'Users' }))
    expect(await screen.findByRole('heading', { name: 'Company users' })).toBeInTheDocument()
  })

  it('says the list failed to load, with a retry, rather than "no companies"', async () => {
    api.listCompanies.mockRejectedValue(new ApiError('boom', 500))
    renderList()
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByText('No companies yet')).not.toBeInTheDocument()
  })
})
