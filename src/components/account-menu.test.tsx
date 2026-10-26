import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { AccountMenu, initialsFromEmail } from './account-menu'

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ data: { companyId: 'c1', companyName: 'Acme Pharma', permissions: [] }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

describe('initialsFromEmail', () => {
  it('takes one letter from each of the first two name parts', () => {
    expect(initialsFromEmail('priya.sharma@acme.com')).toBe('PS')
    expect(initialsFromEmail('ravi@acme.com')).toBe('RA')
    expect(initialsFromEmail(null)).toBe('?')
  })
})

describe('AccountMenu', () => {
  it('shows initials on the trigger and the session when opened', async () => {
    renderWithProviders(<AccountMenu />)
    expect(screen.getByRole('button', { name: 'Account' })).toHaveTextContent('PS')

    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByText('priya.sharma@acme.com')).toBeInTheDocument()
    expect(screen.getByText('Acme Pharma')).toBeInTheDocument()
  })

  it('labels a vendor session as the vendor portal', async () => {
    renderWithProviders(<AccountMenu />, { shell: { portal: 'vendor', email: 'orders@printhouse.in' } })
    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByText('Vendor portal')).toBeInTheDocument()
  })

  it('splits into Profile and Settings tabs, with the theme picker under Settings', async () => {
    renderWithProviders(<AccountMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute('href', '/settings')

    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeInTheDocument()
  })

  it("signs out of this portal's session and goes to /login", async () => {
    const signOut = vi.fn()
    renderWithProviders(
      <Routes>
        <Route path="/" element={<AccountMenu />} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>,
      { shell: { signOut } },
    )
    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
