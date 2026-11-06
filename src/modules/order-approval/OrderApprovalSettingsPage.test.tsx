import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrderApprovalSettings } from '@/api/orderApprovals'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { OrderApprovalSettingsPage } from './OrderApprovalSettingsPage'

const getOrderApprovalSettings = vi.hoisted(() => vi.fn())
const setOrderApprovalSettings = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/orderApprovals', async (importOriginal) => ({ ...(await importOriginal<object>()), getOrderApprovalSettings, setOrderApprovalSettings }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const ROLES = [
  { id: 'r-am', name: 'AM' },
  { id: 'r-rm', name: 'RM' },
]

function settings(overrides: Partial<OrderApprovalSettings> = {}): OrderApprovalSettings {
  return { enabled: false, roleId: null, roleName: null, scope: 'REPORTING_LINE', roles: ROLES, ...overrides }
}

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

describe('OrderApprovalSettingsPage', () => {
  beforeEach(() => {
    getOrderApprovalSettings.mockReset().mockResolvedValue(settings())
    setOrderApprovalSettings.mockReset()
    signedInWith(['order_approval.view', 'order_approval.configure'])
  })

  it('offers nothing to save until something changes, and needs an approver before it can be switched on', async () => {
    renderWithProviders(<OrderApprovalSettingsPage />)
    const toggle = await screen.findByRole('switch', { name: /Orders need approval/ })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled() // on, but nobody picked to approve

    await userEvent.click(screen.getByRole('combobox', { name: 'Approver role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'RM' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('switches approval on with the RM found in the orderer’s reporting line', async () => {
    setOrderApprovalSettings.mockResolvedValue(settings({ enabled: true, roleId: 'r-rm', roleName: 'RM' }))
    renderWithProviders(<OrderApprovalSettingsPage />)
    await userEvent.click(await screen.findByRole('switch', { name: /Orders need approval/ }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Approver role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'RM' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(setOrderApprovalSettings).toHaveBeenCalledWith({ enabled: true, roleId: 'r-rm', scope: 'REPORTING_LINE' }))
  })

  it('shows the setup read-only to someone who may only view it', async () => {
    signedInWith(['order_approval.view'])
    getOrderApprovalSettings.mockResolvedValue(settings({ enabled: true, roleId: 'r-rm', roleName: 'RM' }))
    renderWithProviders(<OrderApprovalSettingsPage />)
    expect(await screen.findByRole('switch', { name: /Orders need approval/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})
