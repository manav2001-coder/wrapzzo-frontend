import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Gift } from '@/api/gifts'
import { renderWithProviders, screen } from '@/test/test-utils'
import { GiftCatalogue } from './gift-catalogue'

function gift(overrides: Partial<Gift>): Gift {
  return {
    id: 'g',
    displayId: 'GID-1',
    name: 'Gift',
    category: 'Misc',
    description: null,
    moq: null,
    leadTimeDays: null,
    active: true,
    photoRequired: false,
    artworkRequired: false,
    modules: ['QUICK_GIFT'],
    price: 100,
    markupFeePercentage: 0,
    commissionFeePercentage: 0,
    totalPrice: 100,
    vendorId: 'v',
    vendorName: 'Vendor',
    images: [],
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

const GIFTS = [
  gift({ id: 'pad-a', name: 'Rx Pad Classic', category: 'Stationery', vendorName: 'Pad Printers', artworkRequired: true, leadTimeDays: 7 }),
  gift({ id: 'pad-b', name: 'Rx Pad Premium', category: 'Stationery', vendorName: 'Print House' }),
  gift({ id: 'mug', name: 'Steel Mug', category: 'Drinkware', vendorName: 'Print House', photoRequired: true }),
]

function renderCatalogue(gifts: Gift[] | undefined = GIFTS, isLoading = false) {
  return renderWithProviders(
    <GiftCatalogue gifts={gifts} isLoading={isLoading} renderActions={(g) => <button type="button">Pick {g.name}</button>} />,
  )
}

const cardNames = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('GiftCatalogue', () => {
  it('shows every gift with its vendor, what it needs and the caller’s actions', () => {
    renderCatalogue()
    expect(cardNames()).toEqual(['Rx Pad Classic', 'Rx Pad Premium', 'Steel Mug'])
    expect(screen.getByText('by Pad Printers')).toBeInTheDocument()
    expect(screen.getByText('Personalised')).toBeInTheDocument()
    expect(screen.getByText('Needs photo')).toBeInTheDocument()
    expect(screen.getByText('7-day lead time')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick Steel Mug' })).toBeInTheDocument()
    expect(screen.getByText('3 gifts')).toBeInTheDocument()
  })

  it('searches across name and vendor', async () => {
    renderCatalogue()
    await userEvent.type(screen.getByLabelText('Search gifts, vendors…'), 'print house')
    expect(cardNames()).toEqual(['Rx Pad Premium', 'Steel Mug'])
  })

  it('narrows to one vendor -- choosing a vendor’s product is choosing the vendor', async () => {
    renderCatalogue()
    await userEvent.click(screen.getByRole('combobox', { name: 'Vendor' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Pad Printers' }))
    expect(cardNames()).toEqual(['Rx Pad Classic'])
  })

  it('offers no vendor filter when only one vendor serves the user', () => {
    renderCatalogue([GIFTS[0]])
    expect(screen.queryByRole('combobox', { name: 'Vendor' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument()
  })

  it('says when nothing matches, and when there is nothing at all', async () => {
    const { unmount } = renderCatalogue()
    await userEvent.type(screen.getByLabelText('Search gifts, vendors…'), 'zzz')
    expect(screen.getByText('No gifts match')).toBeInTheDocument()
    unmount()

    renderCatalogue([])
    expect(screen.getByText('No gifts available yet')).toBeInTheDocument()
  })
})
