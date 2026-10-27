import type { OrderStatus } from '@/api/orders'
import { apiClient } from '@/lib/axiosClient'

/** A company's own warehouse: the vendor ships orders here, and the company delivers them onward. */
export interface Warehouse {
  id: string
  name: string
  address: string
  contactPhone: string | null
  /** Null = serves the whole company (the fallback when no unit-specific warehouse matches). */
  orgUnitId: string | null
  orgUnitName: string | null
  active: boolean
}

export interface WarehouseInput {
  name: string
  address: string
  contactPhone?: string
  orgUnitId: string | null
  active?: boolean
}

/** An order on its way through one of the company's warehouses. */
export interface WarehouseOrder {
  id: string
  displayId: string
  warehouseId: string
  warehouseName: string
  giftName: string | null
  quantity: number
  recipientName: string | null
  recipientPhone: string | null
  /** The final drop; null for a campaign order. */
  deliveryAddress: string | null
  vendorName: string | null
  orgUnitName: string | null
  requestedByName: string | null
  status: OrderStatus
  updatedAt: string
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data } = await apiClient.get<Warehouse[]>('/api/warehouses')
  return data
}

export async function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>('/api/warehouses', input)
  return data
}

export async function updateWarehouse(id: string, input: WarehouseInput): Promise<Warehouse> {
  const { data } = await apiClient.put<Warehouse>(`/api/warehouses/${id}`, input)
  return data
}

export async function listWarehouseOrders(): Promise<WarehouseOrder[]> {
  const { data } = await apiClient.get<WarehouseOrder[]>('/api/warehouses/orders')
  return data
}

export async function advanceWarehouseOrder(orderId: string, status: OrderStatus): Promise<WarehouseOrder> {
  const { data } = await apiClient.post<WarehouseOrder>(`/api/warehouses/orders/${orderId}/status`, { status })
  return data
}
