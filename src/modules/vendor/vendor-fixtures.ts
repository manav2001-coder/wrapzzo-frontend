import type { Gift } from '@/api/gifts'
import type { VendorOrder } from '@/api/vendorOrders'

/** Test fixtures for the vendor portal -- one prescription-pad order and one product, overridable per test. */
export function vendorOrder(overrides: Partial<VendorOrder> = {}): VendorOrder {
  return {
    id: 'o-1',
    displayId: 'ORD-101',
    companyName: 'Alembic',
    campaignName: null,
    giftName: 'Prescription Pad',
    recipientName: 'Dr. Asha Shah',
    recipientPhone: '9800000001',
    recipientPhotoUrl: null,
    price: 40,
    quantity: 5,
    deliveryAddress: '12 MG Road, Pune',
    shipToWarehouseName: null,
    shipToWarehouseAddress: null,
    giftMessage: null,
    doctor: { qualification: 'MBBS, MD', registrationNumber: 'MH-12345', speciality: 'Cardiology', clinicName: 'Shah Heart Clinic' },
    artworkRequired: true,
    artworkApproved: false,
    latestDesignStatus: null,
    latestDesignComment: null,
    designVersions: 0,
    source: 'QUICK_GIFT',
    status: 'PRODUCTION_QUEUE',
    assignedAt: '2026-10-20T10:00:00Z',
    createdAt: '2026-10-20T10:00:00Z',
    ...overrides,
  }
}

export function vendorGift(overrides: Partial<Gift> = {}): Gift {
  return {
    id: 'g-1',
    displayId: 'GID-9',
    name: 'Prescription Pad',
    category: 'Stationery & Desk',
    description: 'A5, 100 leaves',
    moq: 10,
    leadTimeDays: 7,
    active: true,
    photoRequired: false,
    artworkRequired: true,
    modules: ['QUICK_GIFT'],
    price: 40,
    markupFeePercentage: 10,
    commissionFeePercentage: 5,
    totalPrice: 46,
    vendorId: 'v-1',
    vendorName: 'Pad Printers',
    images: [],
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}
