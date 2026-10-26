import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'
import { ProtectedRoute } from './ProtectedRoute'

const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const SIGNED_IN = {
  auth: { accessToken: 'token', refreshToken: 'r', user: { email: 'a@b.c', sub: 'u1' }, rememberMe: true },
}

function renderAt(route: string, signedIn = true) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Sign in</h1>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin/*" element={<h1>Admin</h1>} />
        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        <Route path="/settings" element={<h1>Settings</h1>} />
      </Route>
    </Routes>,
    { route, preloadedState: signedIn ? SIGNED_IN : undefined },
  )
}

const profile = (companyId: string | null) => ({ data: { companyId, companyName: null, permissions: [] }, isLoading: false })

describe('ProtectedRoute', () => {
  beforeEach(() => useCurrentUser.mockReturnValue(profile('c1')))

  it('sends a signed-out visitor to sign in', () => {
    renderAt('/dashboard', false)
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('keeps a company user out of /admin', () => {
    renderAt('/admin/companies')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('keeps platform staff in /admin', () => {
    useCurrentUser.mockReturnValue(profile(null))
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
  })

  it('lets both audiences reach the shared screens', () => {
    useCurrentUser.mockReturnValue(profile(null))
    renderAt('/settings')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('does not bounce anyone before the profile says which side they are on', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: true })
    renderAt('/admin/companies')
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
  })
})
