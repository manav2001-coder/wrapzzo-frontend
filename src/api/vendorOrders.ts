import type { OrderDesignStatus } from '@/api/orderDesigns'
import type { OrderSource, OrderStatus, RecipientPhoto } from '@/api/orders'
import type { Vendor } from '@/api/vendors'
import type { DoctorDetails } from '@/api/recipients'
import { vendorApiClient } from '@/lib/vendorApiClient'

/**
 * A vendor's own view of an order assigned to them -- deliberately narrower than the admin/company
 * Order type: no assignment metadata (it's already scoped to them), and price excludes markup
 * entirely (that's Wrappzo's own margin) -- only the gift's base price plus commission fee.
 */
export interface VendorOrder {
  id: string
  displayId: string
  companyName: string
  campaignName: string | null
  giftName: string | null
  recipientName: string | null
  recipientPhone: string | null
  /** The doctor's pcode -- printed on a personalised pad; null for a campaign order. */
  recipientPcode: string | null
  /** The AM who raised the order and their employee code -- printed on the dispatch label. */
  amName: string
  amCode: string | null
  amMobile: string | null
  amArea: string | null
  /** The division (top-level org unit) the order was raised in -- what the portal's division filter narrows by. */
  divisionId: string | null
  divisionName: string | null
  /** Shown so the vendor can produce a personalized gift correctly -- null until the recipient uploads one. */
  recipientPhotoUrl: string | null
  /** All of the recipient's photos, first one first (recipientPhotoUrl is the first). */
  recipientPhotos: RecipientPhoto[]
  price: number | null
  quantity: number
  /** The final recipient's address -- from the Quick Gift request; null for a campaign order. */
  deliveryAddress: string | null
  /** Set when the order goes through the company's warehouse: ship there, and the warehouse delivers it. */
  shipToWarehouseName: string | null
  shipToWarehouseAddress: string | null
  giftMessage: string | null
  doctor: DoctorDetails | null
  /** The order may not be dispatched until one of its proofs is approved. */
  artworkRequired: boolean
  artworkApproved: boolean
  /** The newest proof's status and review comment -- null before the first upload. */
  latestDesignStatus: OrderDesignStatus | null
  latestDesignComment: string | null
  /** While the newest proof is PENDING_FINAL_APPROVAL: the management level it waits on, of how many. */
  latestDesignApprovalLevel: number | null
  latestDesignApprovalLevels: number | null
  designVersions: number
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

export interface VendorDivision {
  id: string
  name: string
}

/** The divisions the company mapped this vendor to serve -- what the portal's division filter offers. */
export async function listMyVendorDivisions(): Promise<VendorDivision[]> {
  const { data } = await vendorApiClient.get<VendorDivision[]>('/api/vendor/divisions')
  return data
}

/** The signed-in vendor's own record -- name for the portal's greeting. */
export async function getMyVendorProfile(): Promise<Vendor> {
  const { data } = await vendorApiClient.get<Vendor>('/api/vendor/view')
  return data
}
