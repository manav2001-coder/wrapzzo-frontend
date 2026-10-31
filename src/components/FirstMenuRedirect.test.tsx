import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { P } from '@/lib/permissions'
import { renderWithProviders, screen } from '@/test/test-utils'
import { FirstMenuRedirect } from './FirstMenuRedirect'

const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser: currentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const companyUser = (permissions: string[]) => ({ data: { companyId: 'c1', companyName: 'Acme', permissions, managesTeam: false }, isLoading: false })
const staff = (permissions: string[]) => ({ data: { companyId: null, companyName: null, permissions, managesTeam: false }, isLoading: false })

function renderHome() {
  return renderWithProviders(
    <Routes>
      <Route path="/home" element={<FirstMenuRedirect />} />
      <Route path="/dashboard" element={<h1>Company dashboard</h1>} />
      <Route path="/settings" element={<h1>Settings</h1>} />
      <Route path="/admin/dashboard" element={<h1>Platform dashboard</h1>} />
      <Route path="/admin/companies" element={<h1>Companies</h1>} />
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
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('opens platform staff on the first item of their own menu', () => {
    currentUser.mockReturnValue(staff([P.PLATFORM_DASHBOARD_VIEW, P.PLATFORM_COMPANY_VIEW]))
    renderHome()
    expect(screen.getByRole('heading', { name: 'Platform dashboard' })).toBeInTheDocument()
  })

  it('follows what the staff member may reach: no dashboard key, so the next item', () => {
    currentUser.mockReturnValue(staff([P.PLATFORM_COMPANY_VIEW]))
    renderHome()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
