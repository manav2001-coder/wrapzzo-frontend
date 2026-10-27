import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { AppLayout } from './layout'

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ data: { companyId: 'c1', companyName: 'Acme Pharma', permissions: ['dashboard.view'] }, isLoading: false }),
  CURRENT_USER_QUERY_KEY: ['me'],
}))

function renderLayout(portal: 'app' | 'vendor' = 'app') {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout portal={portal} />}>
        <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
      </Route>
    </Routes>,
    { route: '/dashboard' },
  )
}

describe('AppLayout', () => {
  it('renders the outlet inside the header and rail chrome', () => {
    renderLayout()
    expect(screen.getByRole('heading', { name: 'Dashboard page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('puts every page in the one fixed-height region the frame scrolls', () => {
    const { container } = renderLayout()
    const region = container.querySelector('main > .app-page')
    expect(region).not.toBeNull()
    expect(region).toContainElement(screen.getByRole('heading', { name: 'Dashboard page' }))
    expect(container.querySelector('.max-w-screen-2xl')).not.toBeNull()
  })

  /**
   * The shell must be a FIXED height, not min-height: with min-h-screen it grows with its content,
   * so <main> never constrains and the window scrolls instead -- which makes ScrollTop a no-op and
   * breaks `position: sticky` inside main.
   */
  it('makes <main> the real scroll container', () => {
    const { container } = renderLayout()
    const shell = container.firstElementChild
    expect(shell).toHaveClass('h-dvh', 'overflow-hidden')
    expect(shell).not.toHaveClass('min-h-screen')
    const main = container.querySelector('main')
    expect(main).toHaveClass('overflow-y-auto')
    expect(main?.parentElement).toHaveClass('min-h-0')
  })

  it('serves the vendor portal its own nav from the same chrome', () => {
    renderLayout('vendor')
    expect(screen.getAllByRole('link', { name: 'My Products' })[0]).toHaveAttribute('href', '/vendor/gifts')
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })
})
