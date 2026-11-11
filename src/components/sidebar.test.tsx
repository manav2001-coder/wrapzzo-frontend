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
    companyUser(['dashboard.view', 'order.view', 'quick_gift.create', 'gift_store.view', 'doctor.view'])
  })

  it('shows a company user only the entries their keys open', () => {
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /quick gift/i })).toHaveAttribute('href', '/quick-gift')
    // No artwork key, so the Approvals entry is not offered.
    expect(screen.queryByRole('link', { name: /approvals/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /campaign/i })).not.toBeInTheDocument()
  })

  it('offers Approvals only to whoever holds approval.view', () => {
    companyUser(['dashboard.view', 'order.view', 'artwork.review'], true)
    const { unmount } = renderWithProviders(<Sidebar />, { route: '/dashboard' })
    // Reviewing a proof from the Orders page is not the same as the manager queue.
    expect(screen.queryByRole('link', { name: /approvals/i })).not.toBeInTheDocument()
    unmount()

    companyUser(['dashboard.view', 'order.view', 'approval.view'])
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: /approvals/i })).toHaveAttribute('href', '/approvals')
  })

  it('offers Artwork approval settings only to whoever holds the key for it', () => {
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.queryByRole('link', { name: 'Artwork approval' })).not.toBeInTheDocument()
  })

  it('shows Artwork approval to a company admin', () => {
    companyUser(['dashboard.view', 'role.view', 'artwork_approval.view', 'artwork_approval.configure'])
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: 'Artwork approval' })).toHaveAttribute('href', '/masters/artwork-approval')
  })

  it('has one Doctors entry, and no separate My Doctors', () => {
    companyUser(['dashboard.view', 'quick_gift.create', 'doctor.view'])
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: 'Doctors' })).toHaveAttribute('href', '/recipients')
    expect(screen.queryByRole('link', { name: /my doctors/i })).not.toBeInTheDocument()
  })

  it("uses the company's own menu names where it has renamed them", () => {
    companyUser(['dashboard.view', 'quick_gift.create', 'gift_store.view', 'doctor.view'], false, { 'quick-gift': 'Request Prescription Pads', 'gift-store': 'Prescription Pads' })
    renderWithProviders(<Sidebar />, { route: '/dashboard' })
    expect(screen.getByRole('link', { name: 'Request Prescription Pads' })).toHaveAttribute('href', '/quick-gift')
    expect(screen.getByRole('link', { name: 'Prescription Pads' })).toHaveAttribute('href', '/gift-store')
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('shows platform staff the Admin tree instead of the company one', () => {
    useCurrentUser.mockReturnValue({
      data: { companyId: null, companyName: null, permissions: ['platform_company.view', 'platform_company.create', 'platform_company.edit', 'platform_company.status', 'platform_company.configure', 'platform_vendor.view', 'platform_vendor.create', 'platform_vendor.edit', 'platform_vendor.status'] },
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
