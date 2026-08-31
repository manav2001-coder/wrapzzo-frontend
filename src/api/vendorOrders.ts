import type { OrderSource, OrderStatus } from '@/api/orders'
import { vendorApiClient } from '@/lib/vendorApiClient'

/**
 * A vendor's own view of an order assigned to them -- deliberately narrower than the admin/company
 * Order type: no assignment metadata (it's already scoped to them), and price excludes markup
 * entirely (that's Wrapzzo's own margin) -- only the gift's base price plus commission fee.
 */
export interface VendorOrder {
  id: string
  displayId: string
  companyName: string
  campaignName: string | null
  giftName: string | null
  recipientName: string | null
  recipientPhone: string | null
  price: number | null
  source: OrderSource
  status: OrderStatus
  assignedAt: string | null
  createdAt: string
}

export async function listVendorOrders(): Promise<VendorOrder[]> {
  const { data } = await vendorApiClient.get<VendorOrder[]>('/api/vendor/orders/list')
  return data
}

export async function getVendorOrder(id: string): Promise<VendorOrder> {
  const { data } = await vendorApiClient.get<VendorOrder>(`/api/vendor/orders/view/${id}`)
  return data
}

export async function updateVendorOrderStatus(id: string, status: OrderStatus): Promise<VendorOrder> {
  const { data } = await vendorApiClient.post<VendorOrder>(`/api/vendor/orders/updateStatus/${id}`, { status })
  return data
}
