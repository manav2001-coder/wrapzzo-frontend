import type { Order, OrderStatus } from '@/api/orders'
import { vendorApiClient } from '@/lib/vendorApiClient'

/** A vendor's own fulfillment queue -- scoped server-side to the calling vendor throughout. */
export async function listVendorOrders(): Promise<Order[]> {
  const { data } = await vendorApiClient.get<Order[]>('/api/vendor/orders/list')
  return data
}

export async function getVendorOrder(id: string): Promise<Order> {
  const { data } = await vendorApiClient.get<Order>(`/api/vendor/orders/view/${id}`)
  return data
}

export async function updateVendorOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data } = await vendorApiClient.post<Order>(`/api/vendor/orders/updateStatus/${id}`, { status })
  return data
}
