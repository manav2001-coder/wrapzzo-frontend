import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { UserFacingError } from '@/lib/user-facing-error'
import { renderWithProviders, screen } from '@/test/test-utils'
import { useApiErrorToast } from './use-api-error-toast'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

function Trigger({ error, context }: { error: unknown; context?: string }) {
  const showError = useApiErrorToast()
  return <button onClick={() => showError(error, context)}>fail</button>
}

async function fail(error: unknown, context?: string) {
  renderWithProviders(<Trigger error={error} context={context} />)
  await userEvent.click(screen.getByRole('button', { name: 'fail' }))
}

describe('useApiErrorToast', () => {
  beforeEach(() => toastError.mockReset())

  it('shows a failed validation with its reasons, not a bare "Validation failed"', async () => {
    await fail(new ApiError('Validation failed: name must not be blank; contact email must be a well-formed email address.', 400))
    expect(toastError).toHaveBeenCalledWith('Validation failed: name must not be blank; contact email must be a well-formed email address.')
  })

  it('leads with what was being done when a follow-up step fails', async () => {
    await fail(new ApiError('Validation failed: file must be an image.', 400), 'The company was created but its logo failed to upload.')
    expect(toastError).toHaveBeenCalledWith('The company was created but its logo failed to upload. Validation failed: file must be an image.')
  })

  it('says a server fault is a server fault, with its number, rather than echoing its raw text', async () => {
    await fail(new ApiError('Internal Server Error', 500))
    expect(toastError).toHaveBeenCalledWith(expect.not.stringContaining('Internal Server Error'))
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('error 500'))
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('not something you did'))
  })

  it("shows the backend's own explanation of a server fault when it gave one", async () => {
    const reason = 'The server could not load part of this data. This is a fault on our side, not something you did.'
    await fail(new ApiError(reason, 500, { error: reason }))
    expect(toastError).toHaveBeenCalledWith(reason)
  })

  it('shows an error thrown with a reason as it is, instead of the generic line', async () => {
    await fail(new UserFacingError('"logo.png" is not a PDF. Proofs must be PDF files.'))
    expect(toastError).toHaveBeenCalledWith('"logo.png" is not a PDF. Proofs must be PDF files.')
  })

  it('treats a failed fetch as the network, not as "something went wrong"', async () => {
    await fail(new TypeError('Failed to fetch'))
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('connection'))
  })
})
