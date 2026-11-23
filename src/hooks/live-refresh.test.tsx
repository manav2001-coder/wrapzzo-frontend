import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LIVE_COUNT_REFRESH_MS, LIVE_REFRESH_MS, liveRefresh } from '@/lib/live-refresh'
import { useApproveOrderDesign } from './useOrderDesigns'
import { useOrderSummary } from './useOrders'
import { useVendorOrderSummary } from './useVendorOrders'

const getOrderSummary = vi.hoisted(() => vi.fn())
const getVendorOrderSummary = vi.hoisted(() => vi.fn())
const approveOrderDesign = vi.hoisted(() => vi.fn())
vi.mock('@/api/orders', async (importOriginal) => ({ ...(await importOriginal<object>()), getOrderSummary }))
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), getVendorOrderSummary }))
vi.mock('@/api/orderDesigns', async (importOriginal) => ({ ...(await importOriginal<object>()), approveOrderDesign }))

function wrapperWith(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('the artwork loop refreshes on its own', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    getOrderSummary.mockReset().mockResolvedValue({ total: 0, byStatus: {}, awaitingReview: 0, unassigned: 0 })
    getVendorOrderSummary.mockReset().mockResolvedValue({ total: 0, byStage: {} })
    approveOrderDesign.mockReset().mockResolvedValue({})
  })
  afterEach(() => vi.useRealTimers())

  it.each([
    ['the company order figures', () => void useOrderSummary(), getOrderSummary, LIVE_COUNT_REFRESH_MS],
    ['the vendor queue figures', () => void useVendorOrderSummary(), getVendorOrderSummary, LIVE_REFRESH_MS],
  ])('re-fetches %s every interval', async (_name, hook, api, interval) => {
    renderHook(hook, { wrapper: wrapperWith(new QueryClient()) })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    await act(() => vi.advanceTimersByTimeAsync(interval))
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
  })

  it('asks at the normal rate while someone is using the app, and much slower once they have gone quiet', () => {
    const interval = liveRefresh(LIVE_REFRESH_MS)
    expect(interval()).toBe(LIVE_REFRESH_MS)
    vi.setSystemTime(Date.now() + 6 * 60_000)
    expect(interval()).toBeGreaterThanOrEqual(3 * 60_000)
    window.dispatchEvent(new Event('pointerdown'))
    expect(interval()).toBe(LIVE_REFRESH_MS)
  })

  it('a review refreshes the orders list, so its "waiting on review" flag clears', async () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useApproveOrderDesign('o-1'), { wrapper: wrapperWith(client) })
    await act(() => result.current.mutateAsync('d-1'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['order-designs', 'o-1'] })
  })
})
