import { describe, expect, it, vi } from 'vitest'

import { P } from '@/lib/permissions'
import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen } from '@/test/test-utils'
import { PlatformDashboardPage } from './PlatformDashboardPage'

const currentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))

describe('PlatformDashboardPage', () => {
  it('greets the signed-in user and links to the masters they can reach', async () => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_COMPANY_VIEW, P.PLATFORM_VENDOR_VIEW]))

    renderWithProviders(<PlatformDashboardPage />, {
      preloadedState: { auth: { accessToken: 't', refreshToken: 'r', rememberMe: false, user: { sub: 'u-1', email: 'staff@wrappzo.com' } } },
    })

    expect(await screen.findByRole('heading', { level: 1, name: /Wrappzo · staff@wrappzo.com/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Companies/ })).toHaveAttribute('href', '/admin/companies')
    expect(screen.getByRole('link', { name: /Vendors/ })).toHaveAttribute('href', '/admin/vendors')
    expect(screen.queryByRole('link', { name: /Orders/ })).not.toBeInTheDocument()
  })
})
