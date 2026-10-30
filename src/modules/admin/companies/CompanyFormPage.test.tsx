import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, within } from '@/test/test-utils'
import { CompanyFormPage } from './CompanyFormPage'

const companies = vi.hoisted(() => ({
  getCompany: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  activateCompany: vi.fn(),
  deactivateCompany: vi.fn(),
  uploadCompanyLogo: vi.fn(),
  listCompanies: vi.fn(),
}))
vi.mock('@/api/companies', () => companies)
vi.mock('@/api/vendors', () => ({
  listVendors: vi.fn().mockResolvedValue([
    { id: 'v1', name: 'PrintHouse Mumbai', status: 'ACTIVE' },
    { id: 'v2', name: 'GiftCraft Pune', status: 'SUSPENDED' },
  ]),
}))
const roster = vi.hoisted(() => ({
  listCompanyVendors: vi.fn(),
  assignCompanyVendor: vi.fn(),
  unassignCompanyVendor: vi.fn(),
}))
vi.mock('@/api/companyVendors', () => roster)
const flags = vi.hoisted(() => ({ listCompanyFeatureFlags: vi.fn(), setCompanyFeatureFlag: vi.fn() }))
vi.mock('@/api/companyFeatureFlags', () => flags)
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ data: { companyId: null, companyName: null, permissions: ['platform_company.view', 'platform_company.create', 'platform_company.edit', 'platform_company.status', 'platform_company.configure'] }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

const ACME = { id: 'c1', displayId: 'CID-1', name: 'Acme Pharma', status: 'ACTIVE', logoUrl: null, createdAt: '2026-08-21T10:00:00Z' }

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/companies/new" element={<CompanyFormPage />} />
      <Route path="/admin/companies/:id" element={<CompanyFormPage />} />
    </Routes>,
    { route },
  )
}

describe('CompanyFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    companies.getCompany.mockResolvedValue(ACME)
    roster.listCompanyVendors.mockResolvedValue([{ mappingId: 'm1', vendorId: 'v1', vendorName: 'PrintHouse Mumbai' }])
    flags.listCompanyFeatureFlags.mockResolvedValue([
      { flagKey: 'WAREHOUSE_LOGISTICS', displayName: 'Warehouse Logistics', description: 'Two legs', enabled: false },
    ])
  })

  it('requires a name before creating', async () => {
    renderAt('/admin/companies/new')
    await userEvent.click(screen.getByRole('button', { name: 'Create company' }))
    expect(await screen.findByText('This field is required')).toBeInTheDocument()
    expect(companies.createCompany).not.toHaveBeenCalled()
  })

  it('creates a company and opens it', async () => {
    companies.createCompany.mockResolvedValue({ ...ACME, id: 'c9' })
    renderAt('/admin/companies/new')
    await userEvent.type(screen.getByLabelText(/Company name/), 'Orbit Labs')
    await userEvent.click(screen.getByRole('button', { name: 'Create company' }))
    expect(companies.createCompany).toHaveBeenCalledWith('Orbit Labs')
  })

  it('loads the company into the form and saves an edit', async () => {
    companies.updateCompany.mockResolvedValue({ ...ACME, name: 'Acme Pharma Ltd' })
    renderAt('/admin/companies/c1')
    const name = await screen.findByDisplayValue('Acme Pharma')
    await userEvent.clear(name)
    await userEvent.type(name, 'Acme Pharma Ltd')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(companies.updateCompany).toHaveBeenCalledWith('c1', 'Acme Pharma Ltd')
  })

  it("ticks the vendors on the company's roster and adds one when checked", async () => {
    roster.assignCompanyVendor.mockResolvedValue([])
    renderAt('/admin/companies/c1')
    expect(await screen.findByRole('checkbox', { name: /PrintHouse Mumbai/ })).toBeChecked()
    const giftCraft = screen.getByRole('checkbox', { name: /GiftCraft Pune/ })
    expect(giftCraft).not.toBeChecked()
    await userEvent.click(giftCraft)
    expect(roster.assignCompanyVendor).toHaveBeenCalledWith('c1', 'v2')
  })

  it('turns a feature flag on', async () => {
    flags.setCompanyFeatureFlag.mockResolvedValue([])
    renderAt('/admin/companies/c1')
    await userEvent.click(await screen.findByRole('switch', { name: /Warehouse Logistics/ }))
    expect(flags.setCompanyFeatureFlag).toHaveBeenCalledWith('c1', 'WAREHOUSE_LOGISTICS', true)
  })

  it('deactivates through a confirm', async () => {
    companies.deactivateCompany.mockResolvedValue({ ...ACME, status: 'INACTIVE' })
    renderAt('/admin/companies/c1')
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }))
    expect(companies.deactivateCompany).toHaveBeenCalledWith('c1')
  })
})
