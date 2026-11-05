import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { P } from '@/lib/permissions'
import { renderWithProviders, screen } from '@/test/test-utils'
import { FirstMenuRedirect } from './FirstMenuRedirect'

const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser: currentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const companyUser = (permissions: string[]) => ({ data: { companyId: 'c1', companyName: 'Acme', permissions, managesTeam: false }, isLoading: false })
const staff = (permissions: string[]) => ({ data: { companyId: null, companyName: null, permissions, managesTeam: false }, isLoading: false })

/** Where a redirect landed. (In a dev build the General group's Components showcase can come first, so tests name the page they must NOT be on, or accept either.) */
function Where() {
  return <h1>{useLocation().pathname}</h1>
}

function renderHome() {
  return renderWithProviders(
    <Routes>
      <Route path="/home" element={<FirstMenuRedirect />} />
      <Route path="/dashboard" element={<h1>Company dashboard</h1>} />
      <Route path="/admin/dashboard" element={<h1>Platform dashboard</h1>} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/home' },
  )
}

describe('FirstMenuRedirect', () => {
  beforeEach(() => currentUser.mockReset())

  it('opens a company user on their dashboard when it is their first menu', () => {
    currentUser.mockReturnValue(companyUser([P.DASHBOARD_VIEW, P.ORDER_VIEW]))
    renderHome()
    expect(screen.getByRole('heading', { name: 'Company dashboard' })).toBeInTheDocument()
  })

  it('opens a user without the dashboard on the next first item they can reach, not on a page they cannot open', () => {
    currentUser.mockReturnValue(companyUser([P.ORDER_VIEW]))
    renderHome()
    // No dashboard key: not the dashboard, but the first thing they can reach (never an empty screen).
    expect(screen.queryByRole('heading', { name: 'Company dashboard' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^\/(orders|components|quick-gift|gift-store)/ })).toBeInTheDocument()
  })

  it('opens platform staff on the first item of their own menu', () => {
    currentUser.mockReturnValue(staff([P.PLATFORM_DASHBOARD_VIEW, P.PLATFORM_COMPANY_VIEW]))
    renderHome()
    expect(screen.getByRole('heading', { name: 'Platform dashboard' })).toBeInTheDocument()
  })

  it('follows what the staff member may reach: no dashboard key, so the next item', () => {
    currentUser.mockReturnValue(staff([P.PLATFORM_COMPANY_VIEW]))
    renderHome()
    expect(screen.queryByRole('heading', { name: 'Platform dashboard' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^\/(admin\/companies|components)$/ })).toBeInTheDocument()
  })
})
