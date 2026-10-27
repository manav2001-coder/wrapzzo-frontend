import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { MenuNamesPage } from './MenuNamesPage'

const saveMenuLabels = vi.hoisted(() => vi.fn())
vi.mock('@/api/menuLabels', () => ({ saveMenuLabels, getMenuLabels: async () => ({}) }))
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    data: { companyId: 'c1', companyName: 'Alembic', permissions: ['menu.manage'], managesTeam: false, menuLabels: { 'gift-store': 'Prescription Pads' } },
    isLoading: false,
  }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

describe('MenuNamesPage', () => {
  beforeEach(() => {
    saveMenuLabels.mockReset().mockImplementation(async (labels: Record<string, string>) => labels)
  })

  it('lists every menu with its default, showing the names already chosen', () => {
    renderWithProviders(<MenuNamesPage />)
    expect(screen.getByLabelText('Your name for Gift Store')).toHaveValue('Prescription Pads')
    expect(screen.getByLabelText('Your name for Quick Gift')).toHaveValue('')
    expect(screen.getByLabelText('Your name for Quick Gift')).toHaveAttribute('placeholder', 'Quick Gift')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves new names tidied, and a reset name goes back to the default', async () => {
    renderWithProviders(<MenuNamesPage />)
    await userEvent.type(screen.getByLabelText('Your name for Quick Gift'), '  Request   Prescription Pads ')
    await userEvent.click(screen.getByRole('button', { name: 'Use the default name for Gift Store' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveMenuLabels).toHaveBeenCalledWith({ 'quick-gift': 'Request Prescription Pads' }))
  })
})
