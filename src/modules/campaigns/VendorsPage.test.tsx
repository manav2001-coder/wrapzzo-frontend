import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyVendor } from '@/api/companyVendors'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { VendorsPage } from './VendorsPage'

const listMyVendors = vi.hoisted(() => vi.fn())
const addMyVendor = vi.hoisted(() => vi.fn())
const setMyVendorCoverage = vi.hoisted(() => vi.fn())
const editMyVendor = vi.hoisted(() => vi.fn())
const setMyVendorActive = vi.hoisted(() => vi.fn())
const resendMyVendorInvite = vi.hoisted(() => vi.fn())
const listMyOrgUnits = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/myVendors', () => ({ listMyVendors, addMyVendor, setMyVendorCoverage, editMyVendor, setMyVendorActive, resendMyVendorInvite }))
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
const ALL = ['company_vendor.view', 'company_vendor.add', 'company_vendor.assign', 'company_vendor.edit', 'company_vendor.status']

describe('VendorsPage', () => {
  beforeEach(() => {
    listMyVendors.mockReset().mockResolvedValue([
      mapping({ mappingId: 'm-1', orgUnitId: 'd-summit', orgUnitName: 'Summit' }),
      mapping({ mappingId: 'm-2', orgUnitId: 'd-mega', orgUnitName: 'Megacare' }),
      mapping({ mappingId: 'm-3', vendorId: 'v-2', vendorName: 'Everywhere Print' }),
    ])
    for (const fn of [addMyVendor, setMyVendorCoverage, editMyVendor, setMyVendorActive]) fn.mockReset().mockResolvedValue([])
    resendMyVendorInvite.mockReset().mockResolvedValue(undefined)
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

  it('adds a vendor and says where it serves: a ticked division covers its units and only it is sent', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add vendor' }))
    const dialog = await screen.findByRole('dialog')
    const save = within(dialog).getByRole('button', { name: 'Add vendor' })
    expect(save).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Vendor name'), 'New Printer')
    await userEvent.type(within(dialog).getByLabelText('Contact email'), 'new@printer.com')
    expect(save).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Summit/ }))
    expect(within(dialog).getByRole('checkbox', { name: /Lucknow/ })).toBeDisabled()
    await userEvent.click(save)
    await waitFor(() =>
      expect(addMyVendor).toHaveBeenCalledWith({ name: 'New Printer', contactEmail: 'new@printer.com', contactPhone: undefined, wholeCompany: false, orgUnitIds: ['d-summit'] }),
    )
  })

  it('changes where a vendor serves', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Change where Everywhere Print serves' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText('Specific divisions and units'))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Megacare/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save mapping' }))
    await waitFor(() => expect(setMyVendorCoverage).toHaveBeenCalledWith('v-2', { wholeCompany: false, orgUnitIds: ['d-mega'] }))
  })

  it('will not save a mapping that serves nowhere', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Change where Everywhere Print serves' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText('Specific divisions and units'))
    expect(within(dialog).getByRole('button', { name: 'Save mapping' })).toBeDisabled()
    expect(within(dialog).getByText(/Tick at least one division or unit/)).toBeInTheDocument()
  })

  it('edits a vendor’s name', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Everywhere Print' }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByLabelText('Vendor name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Everywhere Printers')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(editMyVendor).toHaveBeenCalledWith('v-2', { name: 'Everywhere Printers', contactPhone: undefined }))
  })

  it('suspends a vendor after confirming', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend Everywhere Print' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Orders it already holds stay with it/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }))
    await waitFor(() => expect(setMyVendorActive).toHaveBeenCalledWith('v-2', false))
  })

  it('resends an invite', async () => {
    renderWithProviders(<VendorsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Resend invite to Everywhere Print' }))
    await waitFor(() => expect(resendMyVendorInvite).toHaveBeenCalledWith('v-2'))
  })

  it('offers no controls to someone without the keys', async () => {
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', permissions: ['company_vendor.view'] }, isLoading: false })
    renderWithProviders(<VendorsPage />)
    await screen.findByText('Pad Printers')
    expect(screen.queryByRole('button', { name: 'Add vendor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Change where/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Suspend|Reactivate/ })).not.toBeInTheDocument()
  })
})
