import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PermissionProvider } from '@/components/permission-provider'
import { useHasAccess, usePermissions } from '@/hooks/use-permission'

// The permission set comes from the profile query and nowhere else, so that is the only seam.
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

function profile(permissions: string[], companyId: string | null = 'company-1') {
  return { data: { permissions, companyId, companyName: 'Acme' }, isLoading: false }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client }, React.createElement(PermissionProvider, null, children))
}

describe('usePermissions', () => {
  beforeEach(() => {
    useCurrentUser.mockReset()
  })

  it('grants a key the profile carries and denies one it does not', () => {
    useCurrentUser.mockReturnValue(profile(['campaign.manage']))
    const { result } = renderHook(() => usePermissions(), { wrapper })
    expect(result.current.hasPermission('campaign.manage')).toBe(true)
    expect(result.current.hasPermission('order.manage')).toBe(false)
  })

  it('denies everything while the profile is still loading', () => {
    // Better to hide a control briefly than to flash one that 403s on click.
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderHook(() => usePermissions(), { wrapper })
    expect(result.current.hasPermission('campaign.manage')).toBe(false)
    expect(result.current.loading).toBe(true)
  })

  it('treats a user with no company as platform staff, and a company user as not', () => {
    useCurrentUser.mockReturnValue(profile(['company.manage'], null))
    expect(renderHook(() => usePermissions(), { wrapper }).result.current.isPlatformStaff).toBe(true)

    useCurrentUser.mockReturnValue(profile(['campaign.manage']))
    expect(renderHook(() => usePermissions(), { wrapper }).result.current.isPlatformStaff).toBe(false)
  })

  it('is not platform staff before the profile has loaded', () => {
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: true })
    expect(renderHook(() => usePermissions(), { wrapper }).result.current.isPlatformStaff).toBe(false)
  })

  it('throws outside a provider instead of silently gating nothing', () => {
    expect(() => renderHook(() => usePermissions())).toThrow(/PermissionProvider/)
  })
})

describe('useHasAccess', () => {
  beforeEach(() => {
    useCurrentUser.mockReturnValue(profile(['campaign.submit', 'quickgift.create']))
  })

  it('passes with no requirement', () => {
    expect(renderHook(() => useHasAccess(undefined), { wrapper }).result.current).toBe(true)
  })

  it('is ANY-of for an array by default and ALL-of with requireAll', () => {
    expect(renderHook(() => useHasAccess(['campaign.manage', 'campaign.submit']), { wrapper }).result.current).toBe(true)
    expect(
      renderHook(() => useHasAccess(['campaign.manage', 'campaign.submit'], true), { wrapper }).result.current,
    ).toBe(false)
  })

  it('fails closed on an explicitly empty array', () => {
    expect(renderHook(() => useHasAccess([]), { wrapper }).result.current).toBe(false)
  })
})
