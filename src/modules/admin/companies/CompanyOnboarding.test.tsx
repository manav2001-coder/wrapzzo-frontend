import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { CompanyListPage } from './CompanyListPage'

const api = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  uploadCompanyLogo: vi.fn(),
  activateCompany: vi.fn(),
  deactivateCompany: vi.fn(),
}))
vi.mock('@/api/companies', () => api)
vi.mock('@/api/companyFeatureFlags', () => ({
  listCompanyFeatureFlags: vi.fn().mockResolvedValue([]),
  setCompanyFeatureFlag: vi.fn(),
  getArtworkApprovalLevels: vi.fn().mockResolvedValue(1),
  setArtworkApprovalLevels: vi.fn(),
}))
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    data: { companyId: null, companyName: null, permissions: ['platform_company.view', 'platform_company.create', 'platform_company.edit', 'platform_company.status'] },
    isLoading: false,
  }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

const ACME = {
  id: 'c1', displayId: 'CID-1', name: 'Acme Pharma', status: 'ACTIVE', logoUrl: null, createdAt: '2026-08-21T10:00:00Z',
  contactPersonName: 'Asha Rao', contactEmail: 'asha@acme.example', contactMobile: null, gstin: '27ABCDE1234F1Z5', pan: null,
  registrationNumber: null, addressLine1: null, addressLine2: null, city: 'Pune', state: null, pincode: null, notes: null,
}

const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/admin/companies" element={<CompanyListPage />} />
    </Routes>,
    { route },
  )

describe('company onboarding drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listCompanies.mockResolvedValue([ACME])
    api.createCompany.mockResolvedValue({ ...ACME, id: 'c2', name: 'Zenith Healthcare' })
  })

  it('shows the company profile as columns in the list', async () => {
    renderAt('/admin/companies')

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('Pune')).toBeInTheDocument()
    expect(screen.getByText('27ABCDE1234F1Z5')).toBeInTheDocument()
  })

  it('opens the onboarding drawer from the Add company button', async () => {
    renderAt('/admin/companies')
    await screen.findByText('Asha Rao')

    await userEvent.click(screen.getByRole('button', { name: 'Add company' }))

    expect(await screen.findByText('Onboard a company')).toBeInTheDocument()
    // The drawer is state, not a route: the address bar stays on the list.
    expect(window.location.pathname).not.toContain('/new')
  })

  it('onboards a company from a drawer: its name and profile, no vendor choice', async () => {
    renderAt('/admin/companies')
    await userEvent.click(await screen.findByRole('button', { name: 'Add company' }))

    await userEvent.type(await screen.findByLabelText(/Company name/), 'Zenith Healthcare')
    await userEvent.type(screen.getByLabelText('Contact person'), 'Ravi Nair')
    await userEvent.type(screen.getByLabelText('GSTIN'), '27abcde1234f1z5')
    expect(screen.queryByRole('checkbox', { name: /vendor/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Onboard company' }))

    await waitFor(() => expect(api.createCompany).toHaveBeenCalled())
    expect(api.createCompany.mock.calls[0][0]).toMatchObject({ name: 'Zenith Healthcare', contactPersonName: 'Ravi Nair', gstin: '27ABCDE1234F1Z5' })
  })

  it('edits an existing company in the same drawer, its issued id read-only', async () => {
    api.updateCompany.mockResolvedValue(ACME)
    renderAt('/admin/companies')
    await userEvent.click(await screen.findByRole('button', { name: 'Acme Pharma' }))

    expect(await screen.findByDisplayValue('CID-1')).toBeDisabled()
    const city = screen.getByLabelText('City')
    await userEvent.clear(city)
    await userEvent.type(city, 'Mumbai')
    await userEvent.click(screen.getByRole('button', { name: /Save/ }))

    await waitFor(() => expect(api.updateCompany).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Acme Pharma', city: 'Mumbai' })))
  })
})
