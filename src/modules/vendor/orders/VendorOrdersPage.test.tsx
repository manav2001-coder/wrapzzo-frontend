import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VendorOrder } from '@/api/vendorOrders'
import { renderWithProviders, screen } from '@/test/test-utils'
import { VendorOrdersPage } from './VendorOrdersPage'

const listVendorOrders = vi.hoisted(() => vi.fn())
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), listVendorOrders }))
vi.mock('@/api/vendorOrderDesigns', () => ({ listVendorOrderDesigns: vi.fn().mockResolvedValue([]), uploadVendorOrderDesign: vi.fn() }))

const PAD_ORDER: VendorOrder = {
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
  giftMessage: null,
  doctor: { qualification: 'MBBS, MD', registrationNumber: 'MH-12345', speciality: 'Cardiology', clinicName: 'Shah Heart Clinic' },
  artworkRequired: true,
  artworkApproved: false,
  source: 'QUICK_GIFT',
  status: 'PRODUCTION_QUEUE',
  assignedAt: '2026-10-20T10:00:00Z',
  createdAt: '2026-10-20T10:00:00Z',
}

describe('VendorOrdersPage -- personalised orders', () => {
  beforeEach(() => listVendorOrders.mockReset())

  it('shows what to print, how many and where to ship', async () => {
    listVendorOrders.mockResolvedValue([PAD_ORDER])
    renderWithProviders(<VendorOrdersPage />)

    expect((await screen.findAllByText('Reg. no. MH-12345')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shah Heart Clinic').length).toBeGreaterThan(0)
    expect(screen.getAllByText('12 MG Road, Pune').length).toBeGreaterThan(0)
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
  })

  it('says dispatch waits on an approved proof until one is approved', async () => {
    listVendorOrders.mockResolvedValue([PAD_ORDER])
    renderWithProviders(<VendorOrdersPage />)
    expect((await screen.findAllByText(/wait for it to be approved before dispatching/)).length).toBeGreaterThan(0)
  })

  it('drops the warning once the artwork is approved', async () => {
    listVendorOrders.mockResolvedValue([{ ...PAD_ORDER, artworkApproved: true }])
    renderWithProviders(<VendorOrdersPage />)
    await screen.findAllByText('Reg. no. MH-12345')
    expect(screen.queryByText(/wait for it to be approved before dispatching/)).not.toBeInTheDocument()
  })
})
