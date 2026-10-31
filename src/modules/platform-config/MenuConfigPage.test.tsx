import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { P } from '@/lib/permissions'
import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { MenuConfigPage } from './MenuConfigPage'

const currentUser = vi.hoisted(() => vi.fn())
const getMenuLabels = vi.hoisted(() => vi.fn())
const saveMenuLabels = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/menuLabels', () => ({ getMenuLabels, saveMenuLabels }))
vi.mock('@/api/companies', async (o) => ({ ...(await o<object>()), listCompanies }))

describe('MenuConfigPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_MENU_CONFIG_VIEW, P.PLATFORM_MENU_CONFIG_EDIT, P.PLATFORM_COMPANY_VIEW]))
    listCompanies.mockReset().mockResolvedValue([{ id: 'c-1', name: 'Alembic', displayId: 'CID-1', status: 'ACTIVE' }])
    getMenuLabels.mockReset().mockResolvedValue({ 'gift-store': 'Prescription Pads' })
    saveMenuLabels.mockReset().mockImplementation(async (_companyId: string, labels: Record<string, string>) => labels)
  })

  it("lists the company's menus with their default, showing the names already chosen for that company", async () => {
    renderWithProviders(<MenuConfigPage />)

    expect(await screen.findByLabelText("Company's name for Gift Store")).toHaveValue('Prescription Pads')
    expect(getMenuLabels).toHaveBeenCalledWith('c-1')
    expect(screen.getByLabelText("Company's name for Quick Gift")).toHaveValue('')
    expect(screen.getByLabelText("Company's name for Quick Gift")).toHaveAttribute('placeholder', 'Quick Gift')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves new names tidied, for that company, and a reset name goes back to the default', async () => {
    renderWithProviders(<MenuConfigPage />)
    await userEvent.type(await screen.findByLabelText("Company's name for Quick Gift"), '  Request   Prescription Pads ')
    await userEvent.click(screen.getByRole('button', { name: 'Use the default name for Gift Store' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saveMenuLabels).toHaveBeenCalledWith('c-1', { 'quick-gift': 'Request Prescription Pads' }))
  })

  it('shows the names read-only without the edit key', async () => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_MENU_CONFIG_VIEW, P.PLATFORM_COMPANY_VIEW]))
    renderWithProviders(<MenuConfigPage />)

    expect(await screen.findByLabelText("Company's name for Gift Store")).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
