import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { SIDEBAR_COLLAPSED_KEY } from './sidebar-provider'
import { Sidebar } from './sidebar'

const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

function companyUser(permissions: string[], managesTeam = false, menuLabels: Record<string, string> = {}) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c1', companyName: 'Acme Pharma', permissions, managesTeam, menuLabels }, isLoading: false })
}

describe('Sidebar', () => {
  beforeEach(() => {
    companyUser(['dashboard.view', 'campaign.submit', 'quickgift.create'])
  })

  it('shows a company user only the entries their keys open', () => {
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /quick gift/i })).toHaveAttribute('href', '/quick-gift')
    // campaign.manage is missing, so the Approvals entry and the Campaigns > Create link are not offered.
    expect(screen.queryByRole('link', { name: /approvals/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('offers Approvals to a manager with direct reports even without an approval key', () => {
    companyUser(['dashboard.view', 'quickgift.create', 'order.track'], true)
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: /approvals/i })).toHaveAttribute('href', '/approvals')
  })

  it("uses the company's own menu names where it has renamed them", () => {
    companyUser(['dashboard.view', 'quickgift.create'], false, { 'quick-gift': 'Request Prescription Pads', 'gift-store': 'Prescription Pads' })
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: 'Request Prescription Pads' })).toHaveAttribute('href', '/quick-gift')
    expect(screen.getByRole('link', { name: 'Prescription Pads' })).toHaveAttribute('href', '/gift-store')
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('shows platform staff the Admin tree instead of the company one', () => {
    useCurrentUser.mockReturnValue({
      data: { companyId: null, companyName: null, permissions: ['company.manage', 'vendor.manage'] },
      isLoading: false,
    })
    renderWithProviders(<Sidebar />, { route: '/admin/companies' })
    expect(screen.getByRole('link', { name: /companies/i })).toHaveAttribute('href', '/admin/companies')
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
  })

  it('marks the current route active', () => {
    renderWithProviders(<Sidebar />, { route: '/quick-gift' })
    expect(screen.getByRole('link', { name: /quick gift/i })).toHaveClass('active')
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveClass('active')
  })

  it('shows placeholders, not an empty "no access" menu, while the profile loads', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: true })
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByTestId('nav-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
  })

  it('says the menu failed to load instead of rendering a plausible, wrong one', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: false, error: new Error('429') })
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByText(/couldn't load your menu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('needs no profile in the vendor portal', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: false })
    renderWithProviders(<Sidebar />, { route: '/vendor/orders', shell: { portal: 'vendor', homePath: '/vendor' } })
    expect(screen.getByRole('link', { name: /orders/i })).toHaveClass('active')
    expect(screen.queryByTestId('nav-skeleton')).not.toBeInTheDocument()
  })

  describe('collapsed rail', () => {
    afterEach(() => localStorage.clear())

    it('is expanded by default and starts collapsed when the persisted state says so', () => {
      const { container, unmount } = renderWithProviders(<Sidebar />, { route: '/dashboard' })
      expect(container.querySelector('aside')).toHaveClass('w-60')
      unmount()

      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true')
      const collapsed = renderWithProviders(<Sidebar />, { route: '/dashboard' })
      expect(collapsed.container.querySelector('aside')).toHaveClass('w-16')
    })

    it('keeps every link reachable by its accessible name when collapsed', () => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true')
      renderWithProviders(<Sidebar />, { route: '/dashboard' })
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('active')
    })
  })
})
