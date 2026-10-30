import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { VendorMappingPage } from './VendorMappingPage'

const currentUser = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
const listCompanyVendors = vi.hoisted(() => vi.fn())
const assignCompanyVendor = vi.hoisted(() => vi.fn())
const unassignCompanyVendor = vi.hoisted(() => vi.fn())
const listVendors = vi.hoisted(() => vi.fn())
const listCompanyOrgUnits = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/companies', async (o) => ({ ...(await o<object>()), listCompanies }))
vi.mock('@/api/companyVendors', async (o) => ({ ...(await o<object>()), listCompanyVendors, assignCompanyVendor, unassignCompanyVendor }))
vi.mock('@/api/vendors', async (o) => ({ ...(await o<object>()), listVendors }))
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), listCompanyOrgUnits }))

const mapping = (id: string, vendorName: string, orgUnitName: string | null) => ({
  mappingId: id,
  vendorId: `v-${id}`,
  vendorName,
  vendorStatus: 'ACTIVE' as const,
  orgUnitId: orgUnitName ? `ou-${id}` : null,
  orgUnitName,
})
const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement

describe('VendorMappingPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(platformStaff(['platform_company.configure', 'platform_vendor.view']))
    listCompanies.mockReset().mockResolvedValue([
      { id: 'c-a', name: 'Alpha Pharma' },
      { id: 'c-b', name: 'Beta Pharma' },
    ])
    listCompanyVendors.mockReset().mockResolvedValue([mapping('m1', 'PrintHouse', null), mapping('m2', 'PrintHouse', 'North'), mapping('m3', 'GiftCraft', 'South')])
    listVendors.mockReset().mockResolvedValue([
      { id: 'v-print', name: 'PrintHouse', status: 'ACTIVE' },
      { id: 'v-gift', name: 'GiftCraft', status: 'ACTIVE' },
    ])
    listCompanyOrgUnits.mockReset().mockResolvedValue([
      { id: 'ou-n', name: 'North', levelName: 'Zone', parentId: null },
      { id: 'ou-s', name: 'South', levelName: 'Zone', parentId: null },
    ])
    assignCompanyVendor.mockReset().mockResolvedValue([])
    unassignCompanyVendor.mockReset().mockResolvedValue([])
  })

  it('opens on the first company and lists each vendor with where it serves', async () => {
    renderWithProviders(<VendorMappingPage />)

    expect(await screen.findByText('South')).toBeInTheDocument()
    expect(screen.getByText('Whole company')).toBeInTheDocument()
    expect(screen.getAllByText('PrintHouse')).toHaveLength(2) // one vendor, two places
    expect(listCompanyVendors).toHaveBeenCalledWith('c-a')
  })

  it('removes one mapping, not every mapping of the vendor', async () => {
    renderWithProviders(<VendorMappingPage />)
    await screen.findByText('South')

    await userEvent.click(within(rowOf('North')).getByRole('button', { name: 'Remove PrintHouse (North)' }))

    await waitFor(() => expect(unassignCompanyVendor).toHaveBeenCalledWith('c-a', 'm2'))
    expect(unassignCompanyVendor).toHaveBeenCalledTimes(1)
  })

  it('assigns the ticked vendors to the whole company and to several org units', async () => {
    renderWithProviders(<VendorMappingPage />)
    await screen.findByText('South')

    await userEvent.click(screen.getByRole('button', { name: 'Assign vendors' }))
    await userEvent.click(await screen.findByLabelText('PrintHouse'))
    await userEvent.click(screen.getByLabelText('Zone: North'))
    await userEvent.click(screen.getByLabelText('Zone: South'))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Assign vendors' }))

    await waitFor(() => expect(assignCompanyVendor).toHaveBeenCalledTimes(3))
    expect(assignCompanyVendor).toHaveBeenCalledWith('c-a', 'v-print', null)
    expect(assignCompanyVendor).toHaveBeenCalledWith('c-a', 'v-print', 'ou-n')
    expect(assignCompanyVendor).toHaveBeenCalledWith('c-a', 'v-print', 'ou-s')
  })

  it('shows another company’s mappings when it is picked in the URL', async () => {
    renderWithProviders(<VendorMappingPage />, { route: '/admin/vendor-mapping?company=c-b' })

    await waitFor(() => expect(listCompanyVendors).toHaveBeenCalledWith('c-b'))
  })

  it('cannot assign or remove without platform_company.configure', async () => {
    currentUser.mockReturnValue(platformStaff(['platform_vendor.view']))
    renderWithProviders(<VendorMappingPage />)
    await screen.findByText('South')

    expect(screen.queryByRole('button', { name: 'Assign vendors' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument()
  })
})
