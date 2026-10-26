import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { renderWithProviders, screen } from '@/test/test-utils'
import { SetPasswordPanel } from './set-password-panel'

function renderPanel(setup: (token: string, password: string, confirm: string) => Promise<unknown>, route = '/setup?token=abc') {
  return renderWithProviders(
    <Routes>
      <Route path="/setup" element={<SetPasswordPanel setup={setup} subtitle="Finish your account" />} />
      <Route path="/login" element={<h1>Sign in page</h1>} />
    </Routes>,
    { route },
  )
}

async function fill(password: string, confirm: string) {
  await userEvent.type(screen.getByLabelText('New password'), password)
  await userEvent.type(screen.getByLabelText('Confirm password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Set password' }))
}

describe('SetPasswordPanel', () => {
  it('says so when the link has no token, instead of offering a form that cannot work', () => {
    renderPanel(vi.fn(), '/setup')
    expect(screen.getByRole('alert')).toHaveTextContent(/missing its token/i)
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('refuses a mismatch before calling the API', async () => {
    const setup = vi.fn()
    renderPanel(setup)
    await fill('longenough1', 'different22')
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(setup).not.toHaveBeenCalled()
  })

  it('sets the password with the token and sends the person to sign in', async () => {
    const setup = vi.fn().mockResolvedValue({})
    renderPanel(setup)
    await fill('longenough1', 'longenough1')
    expect(await screen.findByRole('heading', { name: 'Sign in page' })).toBeInTheDocument()
    expect(setup).toHaveBeenCalledWith('abc', 'longenough1', 'longenough1')
  })

  it("shows the backend's reason when the link is spent", async () => {
    renderPanel(vi.fn().mockRejectedValue(new ApiError('Invite link is invalid or expired', 400)))
    await fill('longenough1', 'longenough1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invite link is invalid or expired')
  })
})
