import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Vendor } from '@/api/vendors'
import { renderWithProviders, screen } from '@/test/test-utils'
import { VendorListPage } from './VendorListPage'

const listVendors = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendors', async (o) => ({ ...(await o<object>()), listVendors }))
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
    useCurrentUser.mockReturnValue({ data: { companyId: null, permissions: ['platform_vendor.view', 'platform_company.view'] }, isLoading: false })
  })

  it('lists every vendor across franchises with who owns it and where it serves', async () => {
    renderWithProviders(<VendorListPage />)
    const sky = (await screen.findByText('Sky Prints')).closest('tr')!
    expect(sky).toHaveTextContent('Alembic')
    expect(sky).toHaveTextContent('Alembic · Whole company')
    expect((await screen.findByText('Pad Printers')).closest('tr')).toHaveTextContent('Other Co · Megacare')
  })

  it('only views: no add, edit, suspend or invite controls', async () => {
    renderWithProviders(<VendorListPage />)
    await screen.findByText('Sky Prints')
    expect(screen.queryByTestId('master-create')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add vendor|edit|suspend|reactivate|resend/i })).not.toBeInTheDocument()
  })
})
