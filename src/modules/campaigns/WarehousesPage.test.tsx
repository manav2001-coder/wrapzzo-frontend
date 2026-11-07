import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WarehouseOrder } from '@/api/warehouses'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { WarehousesPage } from './WarehousesPage'

// What the server holds for the queue; the API answers a page of it and the counts by stage.
const listWarehouseOrders = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const listWarehouses = vi.hoisted(() => vi.fn())
const advanceWarehouseOrder = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/warehouses', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listWarehouses,
  advanceWarehouseOrder,
}))
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

function order(overrides: Partial<WarehouseOrder> = {}): WarehouseOrder {
  return {
    id: 'o-1',
    displayId: 'ORD-101',
    warehouseId: 'w-1',
    warehouseName: 'North Warehouse',
    giftName: 'Prescription Pad',
    quantity: 200,
    recipientName: 'Dr. Asha Shah',
    recipientPhone: '9800000001',
    deliveryAddress: '12 MG Road, Pune',
    orgUnitName: 'North',
    requestedByName: 'Rahul',
    status: 'DISPATCHED',
    updatedAt: '2026-10-27T10:00:00Z',
    ...overrides,
  }
}

describe('WarehousesPage', () => {
  beforeEach(() => {
    listWarehouseOrders.mockReset()
    get.mockReset().mockImplementation(async (url: string, config?: { params?: { filters?: string } }) => {
      const rows = ((await listWarehouseOrders()) ?? []) as WarehouseOrder[]
      if (url === '/api/warehouses/orders/page') {
        const status = (JSON.parse(config?.params?.filters ?? '[]') as { field: string; value: string }[]).find((f) => f.field === 'status')?.value
        const shown = status ? rows.filter((r) => r.status === status) : rows
        return { data: { data: shown, total: shown.length, page: 0, pageSize: 10, hasMore: false } }
      }
      if (url === '/api/warehouses/orders/summary') {
        const counts: Record<string, number> = {}
        for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1
        return { data: counts }
      }
      return { data: [] }
    })
    listWarehouses.mockReset().mockResolvedValue([])
    advanceWarehouseOrder.mockReset()
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', permissions: ['warehouse.view', 'warehouse.setup', 'warehouse.operate'] }, isLoading: false })
  })

  it('receives an inbound order, the one next step for its stage', async () => {
    listWarehouseOrders.mockResolvedValue([order()])
    advanceWarehouseOrder.mockResolvedValue(order({ status: 'RECEIVED_AT_WAREHOUSE' }))
    renderWithProviders(<WarehousesPage />)

    expect(await screen.findByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(screen.getByText('12 MG Road, Pune', { exact: false })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mark received' }))

    await waitFor(() => expect(advanceWarehouseOrder).toHaveBeenCalledWith('o-1', 'RECEIVED_AT_WAREHOUSE'))
  })

  it('offers delivery once an order is out, and nothing to do while it is still with the vendor', async () => {
    listWarehouseOrders.mockResolvedValue([
      order({ id: 'o-out', status: 'OUT_FOR_DELIVERY' }),
      order({ id: 'o-prod', displayId: 'ORD-102', recipientName: 'Dr. Ravi Rao', status: 'PRODUCTION_QUEUE' }),
    ])
    renderWithProviders(<WarehousesPage />)

    expect(await screen.findByText('Dr. Ravi Rao')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark delivered' })).toBeInTheDocument()
    expect(screen.getByText('With the vendor')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark received' })).not.toBeInTheDocument()
  })

  it('shows the orders but no way to move them or to add a warehouse without the operate and setup actions', async () => {
    useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', permissions: ['warehouse.view'] }, isLoading: false })
    listWarehouseOrders.mockResolvedValue([order()])
    renderWithProviders(<WarehousesPage />)

    expect(await screen.findByText('Dr. Asha Shah')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark received' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add warehouse/ })).not.toBeInTheDocument()
  })
})
