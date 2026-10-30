import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { CommandPalette } from './command-palette'

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    data: { companyId: 'c1', companyName: 'Acme', permissions: ['dashboard.view', 'request.create', 'product.view', 'recipient_list.manage'] },
    isLoading: false,
  }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

describe('CommandPalette', () => {
  it('opens on ⌘K and lists the same permitted destinations the sidebar shows', async () => {
    renderWithProviders(<CommandPalette />)
    await userEvent.keyboard('{Meta>}k{/Meta}')

    expect(screen.getByRole('option', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Quick Gift' })).toBeInTheDocument()
    // Not held by this user, so not offered: the palette can't jump anyone to a 403.
    expect(screen.queryByRole('option', { name: 'Approvals' })).not.toBeInTheDocument()
  })

  it('navigates to the chosen destination', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<CommandPalette />} />
        <Route path="/quick-gift" element={<h1>Quick Gift page</h1>} />
      </Routes>,
    )
    await userEvent.click(screen.getAllByRole('button', { name: /search/i })[0])
    await userEvent.click(screen.getByRole('option', { name: 'Quick Gift' }))
    expect(await screen.findByRole('heading', { name: 'Quick Gift page' })).toBeInTheDocument()
  })

  it('signs out through the session', async () => {
    const signOut = vi.fn()
    renderWithProviders(<CommandPalette />, { shell: { signOut } })
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.click(screen.getByRole('option', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledOnce()
  })
})
