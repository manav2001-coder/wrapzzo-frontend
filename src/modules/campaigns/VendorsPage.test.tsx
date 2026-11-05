import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyVendor } from '@/api/companyVendors'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { VendorsPage } from './VendorsPage'

const listMyVendors = vi.hoisted(() => vi.fn())
const listAvailableVendors = vi.hoisted(() => vi.fn())
const setMyVendorCoverage = vi.hoisted(() => vi.fn())
const removeMyVendor = vi.hoisted(() => vi.fn())
const listMyOrgUnits = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/myVendors', async (o) => ({ ...(await o<object>()), listMyVendors, listAvailableVendors, setMyVendorCoverage, removeMyVendor }))
vi.mock('@/api/myOrgUnits', () => ({ listMyOrgUnits }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const mapping = (overrides: Partial<CompanyVendor>): CompanyVendor => ({
  mappingId: 'm-1',
  vendorId: 'v-1',
  vendorName: 'Pad Printers',
  vendorStatus: 'ACTIVE',
  orgUnitId: null,
  orgUnitName: null,
  ...overrides,
})

const UNITS = [
  { id: 'd-summit', name: 'Summit', levelName: 'Division', parentId: null },
  { id: 'z-lucknow', name: 'Lucknow', levelName: 'Zone', parentId: 'd-summit' },
  { id: 'd-mega', name: 'Megacare', levelName: 'Division', parentId: null },
]
const ALL = ['company_vendor.view', 'company_vendor.add', 'company_vendor.assign', 'company_vendor.remove']

describe('VendorsPage', () => {
  beforeEach(() => {
    listMyVendors.mockReset().mockResolvedValue([
      mapping({ mappingId: 'm-1', orgUnitId: 'd-summit', orgUnitName: 'Summit' }),
      mapping({ mappingId: 'm-2', orgUnitId: 'd-mega', orgUnitName: 'Megacare' }),
      mapping({ mappingId: 'm-3', vendorId: 'v-2', vendorName: 'Everywhere Print' }),
    ])
    listAvailableVendors.mockReset().mockResolvedValue([{ id: 'v-9', name: 'New Printer' }])
    setMyVendorCoverage.mockReset().mockResolvedValue([])
    removeMyVendor.mockReset().mockResolvedValue([])
    listMyOrgUnits.mockReset().mockResolvedValue(UNITS)
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', permissions: ALL }, isLoading: false })
  })

  it('shows one row per vendor with the divisions it serves', async () => {
    renderWithProviders(<VendorsPage />)
    const printers = (await screen.findByText('Pad Printers')).closest('tr')!
    expect(within(printers).getByText('Summit')).toBeInTheDocument()
    expect(within(printers).getByText('Megacare')).toBeInTheDocument()
    expect(within(screen.getByText('Everywhere Print').closest('tr')!).getByText('Whole company')).toBeInTheDocument()
  })

  it('changes where a vendor serves: a ticked division covers its units, and only it is sent', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Change where Everywhere Print serves' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText('Specific divisions and units'))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Summit/ }))
    expect(within(dialog).getByRole('checkbox', { name: /Lucknow/ })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /Lucknow/ })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save mapping' }))
    await waitFor(() => expect(setMyVendorCoverage).toHaveBeenCalledWith('v-2', { wholeCompany: false, orgUnitIds: ['d-summit'] }))
  })

  it('will not save a mapping that serves nowhere', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Change where Everywhere Print serves' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText('Specific divisions and units'))
    expect(within(dialog).getByRole('button', { name: 'Save mapping' })).toBeDisabled()
    expect(within(dialog).getByText(/Tick at least one division or unit/)).toBeInTheDocument()
  })

  it('maps an existing vendor to the whole company', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Map existing vendor' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Vendor' }))
    await userEvent.click(await screen.findByRole('option', { name: 'New Printer' }))
    await userEvent.click(within(dialog).getByLabelText('Whole company'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save mapping' }))
    await waitFor(() => expect(setMyVendorCoverage).toHaveBeenCalledWith('v-9', { wholeCompany: true, orgUnitIds: [] }))
  })

  it('removes a vendor after confirming', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Everywhere Print' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Orders it already holds stay with it.', { exact: false })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove vendor' }))
    await waitFor(() => expect(removeMyVendor).toHaveBeenCalledWith('v-2'))
  })

  it('offers no mapping controls to someone without the keys', async () => {
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', permissions: ['company_vendor.view'] }, isLoading: false })
    renderWithProviders(<VendorsPage />)
    await screen.findByText('Pad Printers')
    expect(screen.queryByRole('button', { name: 'Map existing vendor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Change where/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()
  })
})
