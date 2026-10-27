import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { AccessControlPage } from './AccessControlPage'

const CATALOG = [
  { id: 'ac-qg', key: 'quickgift.create', name: 'Send Quick Gifts', description: 'Order gifts for a doctor', category: 'Gifting', type: 'FUNCTIONAL' },
  { id: 'ac-track', key: 'order.track', name: 'Track Orders', description: 'See team orders', category: 'Order', type: 'FUNCTIONAL' },
  { id: 'ac-camp', key: 'campaign.manage', name: 'Manage Campaigns', description: null, category: 'Campaigns', type: 'FUNCTIONAL' },
]
const replaceDesignationAccess = vi.hoisted(() => vi.fn())
vi.mock('@/api/accessControls', () => ({ listAccessControlCatalog: async () => CATALOG }))
vi.mock('@/api/designations', () => ({
  listDesignations: async () => ['Medical Representative'],
  // Nothing added to the designation itself; its two people are Members, who can send Quick Gifts.
  getDesignationAccess: async () => ({
    designation: 'Medical Representative',
    accessControlIds: [],
    roles: [{ roleName: 'Member', userCount: 2, accessControlIds: ['ac-qg'] }],
  }),
  replaceDesignationAccess,
}))
vi.mock('@/hooks/useCompanies', () => ({ useCompanies: () => ({ data: [{ id: 'c1', name: 'Alembic Pharmaceuticals' }] }) }))

async function openMedicalRepresentative() {
  renderWithProviders(<AccessControlPage />)
  await userEvent.click(screen.getByLabelText(/company/i))
  await userEvent.click(await screen.findByText('Alembic Pharmaceuticals'))
  await userEvent.click(screen.getByLabelText(/designation/i))
  await userEvent.click(await screen.findByText('Medical Representative'))
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(CATALOG.length))
}

describe('AccessControlPage', () => {
  it("shows what a designation's people get from their role, ticked and locked", async () => {
    await openMedicalRepresentative()
    const quickGift = screen.getByRole('checkbox', { name: 'Send Quick Gifts' })
    expect(quickGift).toHaveAttribute('data-state', 'checked')
    expect(quickGift).toBeDisabled()
    expect(screen.getByText('From role: Member')).toBeInTheDocument()
    expect(screen.getByText('Role held: Member (2 people)')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 permission in effect')).toBeInTheDocument()

    const track = screen.getByRole('checkbox', { name: 'Track Orders' })
    expect(track).toHaveAttribute('data-state', 'unchecked')
    expect(track).toBeEnabled()
  })

  it('saves only the extras added to the designation, never the role grants', async () => {
    replaceDesignationAccess.mockResolvedValue({ designation: 'Medical Representative', accessControlIds: ['ac-track'], roles: [] })
    await openMedicalRepresentative()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Track Orders' }))
    const card = screen.getByRole('checkbox', { name: 'Track Orders' }).closest('section') ?? document.body
    await userEvent.click(within(card as HTMLElement).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(replaceDesignationAccess).toHaveBeenCalledWith('c1', 'Medical Representative', ['ac-track']),
    )
  })
})
