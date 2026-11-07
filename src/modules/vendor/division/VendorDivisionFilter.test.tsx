import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeVendorApi } from '@/test/fake-vendor-api'
import { renderWithProviders, screen } from '@/test/test-utils'
import { vendorOrder } from '../vendor-fixtures'
import { VendorDivisionFilter } from './VendorDivisionFilter'

const get = vi.hoisted(() => vi.fn())
const listMyVendorDivisions = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), listMyVendorDivisions }))
vi.mock('@/lib/vendorApiClient', async (importOriginal) => ({ ...(await importOriginal<object>()), vendorApiClient: { get } }))

describe('VendorDivisionFilter', () => {
  beforeEach(() => {
    get.mockReset().mockImplementation(fakeVendorApi([vendorOrder({ id: 'a', divisionId: 'd1', divisionName: 'Summit' })]))
  })

  it('appears for a vendor mapped to two divisions even though every order so far is from one', async () => {
    listMyVendorDivisions.mockReset().mockResolvedValue([{ id: 'd1', name: 'Summit' }, { id: 'd9', name: 'ZENOVI' }])
    renderWithProviders(<VendorDivisionFilter />)
    expect(await screen.findByRole('combobox', { name: 'Division' })).toBeInTheDocument()
  })

  it('stays out of the way for a vendor that serves a single division', async () => {
    listMyVendorDivisions.mockReset().mockResolvedValue([{ id: 'd1', name: 'Summit' }])
    renderWithProviders(<VendorDivisionFilter />)
    await vi.waitFor(() => expect(listMyVendorDivisions).toHaveBeenCalled())
    expect(screen.queryByRole('combobox', { name: 'Division' })).not.toBeInTheDocument()
  })
})
