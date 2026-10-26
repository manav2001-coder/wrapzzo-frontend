import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ErrorTable } from './error-table'

describe('ErrorTable', () => {
  it('announces itself as an alert', () => {
    renderWithProviders(<ErrorTable error={new ApiError('boom', 500)} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it("shows the backend's own domain message for a refusal", () => {
    renderWithProviders(<ErrorTable error={new ApiError('A gift with this name already exists', 409)} />)
    expect(screen.getByText('A gift with this name already exists')).toBeInTheDocument()
  })

  it('hides a server fault behind the friendly generic line', () => {
    renderWithProviders(<ErrorTable error={new ApiError('relation "orders" does not exist', 500)} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument()
  })

  it('reports no response at all as a connectivity problem', () => {
    renderWithProviders(<ErrorTable error={new ApiError('Network Error')} />)
    expect(screen.getByText(/can't reach the server/i)).toBeInTheDocument()
  })

  it('falls back to the generic line for a non-API error', () => {
    renderWithProviders(<ErrorTable error="just a string" />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('offers Retry only when a handler is given', async () => {
    const { unmount } = renderWithProviders(<ErrorTable error={new ApiError('boom', 500)} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    unmount()

    const onRetry = vi.fn()
    renderWithProviders(<ErrorTable error={new ApiError('boom', 500)} onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
