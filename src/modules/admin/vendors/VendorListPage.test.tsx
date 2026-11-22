import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Vendor } from '@/api/vendors'
import userEvent from '@testing-library/user-event'

import { renderWithProviders, screen, within } from '@/test/test-utils'
import { VendorListPage } from './VendorListPage'

const listVendors = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
const getVendorCoverage = vi.hoisted(() => vi.fn())
const listCompanyOrgUnits = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendors', async (o) => ({ ...(await o<object>()), listVendors, getVendorCoverage }))
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), listCompanyOrgUnits }))
vi.mock('@/api/companies', async (o) => ({ ...(await o<object>()), listCompanies }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const vendor = (overrides: Partial<Vendor>): Vendor => ({
  id: 'v-1',
  displayId: 'VID-1',
  name: 'Sky Prints',
  contactEmail: 'sky@prints.com',
  contactPhone: null,
  companyName: 'Alembic',
  serves: ['Alembic · Whole company'],
  markupFees: null,
  commission: null,
  status: 'ACTIVE',
  createdAt: '2026-10-01T10:00:00Z',
  ...overrides,
})

describe('platform VendorListPage', () => {
  beforeEach(() => {
    listVendors.mockReset().mockResolvedValue([vendor({}), vendor({ id: 'v-2', displayId: 'VID-2', name: 'Pad Printers', companyName: 'Other Co', serves: ['Other Co · Summit', 'Other Co · Megacare'] })])
    listCompanies.mockReset().mockResolvedValue([])
    getVendorCoverage.mockReset().mockResolvedValue([{ companyId: 'c-2', companyName: 'Other Co', orgUnitIds: ['d-summit'] }, { companyId: 'c-1', companyName: 'Alembic', orgUnitIds: [] }])
    listCompanyOrgUnits.mockReset().mockResolvedValue([
      { id: 'd-summit', name: 'Summit', levelName: 'Division', parentId: null },
      { id: 'z-lucknow', name: 'Lucknow', levelName: 'Zone', parentId: 'd-summit' },
      { id: 'd-mega', name: 'Megacare', levelName: 'Division', parentId: null },
    ])
    useCurrentUser.mockReturnValue({ data: { companyId: null, permissions: ['platform_vendor.view', 'platform_company.view'] }, isLoading: false })
  })

  it('lists every vendor across franchises with who owns it and where it serves', async () => {
    renderWithProviders(<VendorListPage />)
    const sky = (await screen.findByText('Sky Prints')).closest('tr')!
    expect(sky).toHaveTextContent('Alembic')
    expect(sky).toHaveTextContent('Alembic · Whole company')
    expect((await screen.findByText('Pad Printers')).closest('tr')).toHaveTextContent('Other Co · Megacare')
  })

  it('shows where a vendor serves in each company, read-only', async () => {
    renderWithProviders(<VendorListPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'View where Pad Printers serves' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Alembic')).toBeInTheDocument()
    expect(within(dialog).getByText('Whole company')).toBeInTheDocument()
    expect(await within(dialog).findByRole('checkbox', { name: /Summit/ })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /Lucknow/ })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /Megacare/ })).not.toBeChecked()
    for (const box of within(dialog).getAllByRole('checkbox')) expect(box).toBeDisabled()
  })

  it('only views: no add, edit, suspend or invite controls', async () => {
    renderWithProviders(<VendorListPage />)
    await screen.findByText('Sky Prints')
    expect(screen.queryByTestId('master-create')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add vendor|edit|suspend|reactivate|resend/i })).not.toBeInTheDocument()
  })

  it('shows when each vendor was last active, and filters by it, only with the activity permission', async () => {
    const recent = new Date(Date.now() - 2 * 3_600_000).toISOString()
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString()
    listVendors.mockResolvedValue([
      vendor({ lastActiveAt: recent }),
      vendor({ id: 'v-2', displayId: 'VID-2', name: 'Pad Printers', lastActiveAt: old }),
      vendor({ id: 'v-3', displayId: 'VID-3', name: 'New Vendor', lastActiveAt: null }),
    ])

    // Without the permission: no column, no filter.
    const without = renderWithProviders(<VendorListPage />)
    await screen.findByText('Sky Prints')
    expect(screen.queryByText('2 hours ago')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Activity' })).not.toBeInTheDocument()
    without.unmount()

    useCurrentUser.mockReturnValue({ data: { companyId: null, permissions: ['platform_vendor.view', 'platform_company.view', 'platform_user_activity.view'] }, isLoading: false })
    renderWithProviders(<VendorListPage />)
    expect((await screen.findByText('Sky Prints')).closest('tr')).toHaveTextContent('2 hours ago')
    expect(screen.getByText('Pad Printers').closest('tr')).toHaveTextContent('last month')
    expect(screen.getByText('New Vendor').closest('tr')).toHaveTextContent('Never signed in')

    await userEvent.click(screen.getByRole('combobox', { name: 'Activity' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Not active for 30+ days' }))
    expect(await screen.findByText('Pad Printers')).toBeInTheDocument()
    expect(screen.queryByText('Sky Prints')).not.toBeInTheDocument()
    expect(screen.queryByText('New Vendor')).not.toBeInTheDocument()
  })
})
