import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LIVE_REFRESH_MS } from '@/lib/live-refresh'
import { useApproveOrderDesign } from './useOrderDesigns'
import { useOrders } from './useOrders'
import { useVendorOrders } from './useVendorOrders'

const listOrders = vi.hoisted(() => vi.fn())
const listVendorOrders = vi.hoisted(() => vi.fn())
const approveOrderDesign = vi.hoisted(() => vi.fn())
vi.mock('@/api/orders', async (importOriginal) => ({ ...(await importOriginal<object>()), listOrders }))
vi.mock('@/api/vendorOrders', async (importOriginal) => ({ ...(await importOriginal<object>()), listVendorOrders }))
vi.mock('@/api/orderDesigns', async (importOriginal) => ({ ...(await importOriginal<object>()), approveOrderDesign }))

function wrapperWith(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('the artwork loop refreshes on its own', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    listOrders.mockReset().mockResolvedValue([])
    listVendorOrders.mockReset().mockResolvedValue([])
    approveOrderDesign.mockReset().mockResolvedValue({})
  })
  afterEach(() => vi.useRealTimers())

  it.each([
    ['the company orders', () => void useOrders(), listOrders],
    ['the vendor queue', () => void useVendorOrders(), listVendorOrders],
  ])('re-fetches %s every interval', async (_name, hook, api) => {
    renderHook(hook, { wrapper: wrapperWith(new QueryClient()) })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS))
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
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
