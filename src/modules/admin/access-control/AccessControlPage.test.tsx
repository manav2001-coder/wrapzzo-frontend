import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { AccessControlPage } from './AccessControlPage'

const item = (id: string, key: string, category: string, name: string, sortOrder: number) => {
  const [module, action] = key.split('.')
  return { id, key, module, action, name, description: null, category, type: 'FUNCTIONAL', sortOrder }
}
const CATALOG = [
  item('ac-req-create', 'request.create', 'Requests', 'Create', 400),
  item('ac-req-approve', 'request.approve', 'Requests', 'Approve', 401),
  item('ac-order-view', 'order.view', 'Orders', 'View', 600),
  item('ac-order-review', 'order.artwork_review', 'Orders', 'Review artwork', 601),
]
const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-current-user')>()),
  useCurrentUser: currentUser,
}))
const replaceDesignationAccess = vi.hoisted(() => vi.fn())
vi.mock('@/api/accessControls', () => ({ listAccessControlCatalog: async () => CATALOG }))
vi.mock('@/api/designations', () => ({
  listDesignations: async () => ['Medical Representative'],
  // Nothing added to the designation itself; its two people are Members, who can place requests.
  getDesignationAccess: async () => ({
    designation: 'Medical Representative',
    accessControlIds: [],
    roles: [{ roleName: 'Member', userCount: 2, accessControlIds: ['ac-req-create'] }],
  }),
  replaceDesignationAccess,
}))
vi.mock('@/hooks/useCompanies', () => ({ useCompanies: () => ({ data: [{ id: 'c1', name: 'Alembic Pharmaceuticals' }] }) }))

function signedInWith(permissions: string[]) {
  currentUser.mockReturnValue({ data: { companyId: null, companyName: null, permissions }, isLoading: false })
}

async function openMedicalRepresentative() {
  renderWithProviders(<AccessControlPage />)
  await userEvent.click(screen.getByLabelText(/company/i))
  await userEvent.click(await screen.findByText('Alembic Pharmaceuticals'))
  await userEvent.click(screen.getByLabelText(/designation/i))
  await userEvent.click(await screen.findByText('Medical Representative'))
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(CATALOG.length))
}

const checkbox = (name: string) => screen.getByRole('checkbox', { name })
const saveButton = () => screen.getByRole('button', { name: 'Save' })

describe('AccessControlPage', () => {
  beforeEach(() => {
    replaceDesignationAccess.mockReset()
    signedInWith(['access.view', 'access.edit'])
  })

  it('lays the catalogue out as modules with their actions', async () => {
    await openMedicalRepresentative()
    const rows = screen.getAllByRole('row')
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['Requests', 'Orders'])
    expect(within(rows[1]).getAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))).toEqual([
      'Orders: View',
      'Orders: Review artwork',
    ])
  })

  it("shows what a designation's people get from their role, ticked and locked", async () => {
    await openMedicalRepresentative()
    expect(checkbox('Requests: Create')).toHaveAttribute('data-state', 'checked')
    expect(checkbox('Requests: Create')).toBeDisabled()
    expect(screen.getByText('Role held: Member (2 people)')).toBeInTheDocument()
    expect(screen.getByText('1 of 4 permission in effect')).toBeInTheDocument()
    expect(checkbox('Requests: Approve')).toHaveAttribute('data-state', 'unchecked')
    expect(checkbox('Requests: Approve')).toBeEnabled()
  })

  it("ticking an action includes the module's View and locks it on", async () => {
    replaceDesignationAccess.mockResolvedValue({ designation: 'Medical Representative', accessControlIds: [], roles: [] })
    await openMedicalRepresentative()
    await userEvent.click(checkbox('Orders: Review artwork'))
    expect(checkbox('Orders: View')).toHaveAttribute('data-state', 'checked')
    expect(checkbox('Orders: View')).toBeDisabled()

    await userEvent.click(saveButton())
    await waitFor(() => expect(replaceDesignationAccess).toHaveBeenCalled())
    const [, , ids] = replaceDesignationAccess.mock.calls[0]
    expect([...ids].sort()).toEqual(['ac-order-review', 'ac-order-view'])
  })

  it('saves only what was added to the designation, never the role grants', async () => {
    replaceDesignationAccess.mockResolvedValue({ designation: 'Medical Representative', accessControlIds: [], roles: [] })
    await openMedicalRepresentative()
    await userEvent.click(checkbox('Requests: Approve'))
    await userEvent.click(saveButton())
    await waitFor(() => expect(replaceDesignationAccess).toHaveBeenCalledWith('c1', 'Medical Representative', ['ac-req-approve']))
  })

  it('is read-only without the edit action', async () => {
    signedInWith(['access.view'])
    await openMedicalRepresentative()
    expect(checkbox('Requests: Approve')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})
