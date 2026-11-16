import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'

const forgotPassword = vi.hoisted(() => vi.fn())
const resetPassword = vi.hoisted(() => vi.fn())
const resetVendorPassword = vi.hoisted(() => vi.fn())
vi.mock('@/api/auth', async (o) => ({ ...(await o<object>()), forgotPassword, resetPassword }))
vi.mock('@/api/vendorAuth', async (o) => ({ ...(await o<object>()), resetVendorPassword }))

describe('ForgotPasswordPage', () => {
  beforeEach(() => forgotPassword.mockReset().mockResolvedValue(undefined))

  it('asks for the email and, whoever it is, says the same thing afterwards', async () => {
    renderWithProviders(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Work email'), 'nobody@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('nobody@example.com'))
    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    // It never says whether there is an account.
    expect(screen.getByText(/If there is an account for nobody@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/stops working after 30 minutes/)).toBeInTheDocument()
  })

  it('does not ask the server about something that is not an email', async () => {
    renderWithProviders(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Work email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(forgotPassword).not.toHaveBeenCalled()
  })

  it('says so when the server could not be reached, and lets them try again', async () => {
    forgotPassword.mockRejectedValueOnce(new Error('network'))
    renderWithProviders(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('Work email'), 'priya@acme.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be sent')
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetPassword.mockReset().mockResolvedValue(undefined)
    resetVendorPassword.mockReset().mockResolvedValue(undefined)
  })

  const renderReset = (_kind: 'user' | 'vendor', route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/vendor/reset-password" element={<ResetPasswordPage kind="vendor" />} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>,
      { route },
    )

  it('sets the new password from the link, and sends the person to sign in rather than signing them in', async () => {
    renderReset('user', '/reset-password?token=abc')
    await userEvent.type(screen.getByLabelText('New password'), 'a-brand-new-one')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-brand-new-one')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('abc', 'a-brand-new-one', 'a-brand-new-one'))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('uses the vendor endpoint for a vendor’s link', async () => {
    renderReset('vendor', '/vendor/reset-password?token=vtok')
    await userEvent.type(screen.getByLabelText('New password'), 'a-brand-new-one')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-brand-new-one')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(resetVendorPassword).toHaveBeenCalledWith('vtok', 'a-brand-new-one', 'a-brand-new-one'))
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('refuses a short or unconfirmed password without asking the server', async () => {
    renderReset('user', '/reset-password?token=abc')
    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('New password'))
    await userEvent.type(screen.getByLabelText('New password'), 'a-brand-new-one')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('shows what the server says is wrong with the link, and offers a new one', async () => {
    const error = Object.assign(new Error('bad'), { isAxiosError: true, response: { data: { error: 'This reset link is invalid, expired, or already used. Ask for a new one' } } })
    resetPassword.mockRejectedValueOnce(error)
    renderReset('user', '/reset-password?token=old')
    await userEvent.type(screen.getByLabelText('New password'), 'a-brand-new-one')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-brand-new-one')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid, expired, or already used')
    expect(screen.getByRole('link', { name: 'Ask for a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  it('says the link is incomplete when it has no token', () => {
    renderReset('user', '/reset-password')
    expect(screen.getByRole('alert')).toHaveTextContent('missing its token')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })
})
