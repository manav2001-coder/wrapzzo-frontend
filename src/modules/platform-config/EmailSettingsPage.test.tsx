import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmailSettings } from '@/api/emailSettings'
import { P } from '@/lib/permissions'
import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { EmailSettingsPage } from './EmailSettingsPage'

const currentUser = vi.hoisted(() => vi.fn())
const getEmailSettings = vi.hoisted(() => vi.fn())
const setWorkflowEmails = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/emailSettings', () => ({ getEmailSettings, setWorkflowEmails }))

const settings = (on: boolean, by: string | null = null): EmailSettings => ({
  workflowEmailsEnabled: on,
  updatedAt: by ? '2026-11-15T06:00:00Z' : null,
  updatedByName: by,
})

describe('EmailSettingsPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_EMAIL_SETTINGS_VIEW, P.PLATFORM_EMAIL_SETTINGS_EDIT]))
    getEmailSettings.mockReset().mockResolvedValue(settings(true))
    setWorkflowEmails.mockReset().mockImplementation(async (on: boolean) => settings(on, 'Priya'))
  })

  it('shows the emails are on, and says which emails are and are not governed by the switch', async () => {
    renderWithProviders(<EmailSettingsPage />)

    expect(await screen.findByRole('switch', { name: 'Send order workflow emails' })).toBeChecked()
    expect(screen.getByText('Order workflow emails are being sent.')).toBeInTheDocument()
    expect(screen.getByText('Account setup emails for new users and vendors')).toBeInTheDocument()
    expect(screen.getByText('Password reset and setup links')).toBeInTheDocument()
    expect(screen.getByText('Daily reminders to approvers')).toBeInTheDocument()
    expect(screen.getByText('Not changed yet.')).toBeInTheDocument()
  })

  it('switches the emails off, and shows what the server saved with who changed it', async () => {
    renderWithProviders(<EmailSettingsPage />)
    await userEvent.click(await screen.findByRole('switch', { name: 'Send order workflow emails' }))

    await waitFor(() => expect(setWorkflowEmails).toHaveBeenCalledWith(false))
    expect(await screen.findByText('Order workflow emails are switched off: none are being sent.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Send order workflow emails' })).not.toBeChecked()
    expect(screen.getByText(/Last changed by Priya/)).toBeInTheDocument()
    expect(screen.getByText(/not sent later/)).toBeInTheDocument()
  })

  it('switches them back on', async () => {
    getEmailSettings.mockResolvedValue(settings(false, 'Priya'))
    renderWithProviders(<EmailSettingsPage />)
    await userEvent.click(await screen.findByRole('switch', { name: 'Send order workflow emails' }))

    await waitFor(() => expect(setWorkflowEmails).toHaveBeenCalledWith(true))
    expect(await screen.findByText('Order workflow emails are being sent.')).toBeInTheDocument()
  })

  it('keeps the switch where it was and says why when the change is refused', async () => {
    setWorkflowEmails.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { error: 'You do not have permission to change the email settings.' } } })
    renderWithProviders(<EmailSettingsPage />)
    await userEvent.click(await screen.findByRole('switch', { name: 'Send order workflow emails' }))

    await waitFor(() => expect(setWorkflowEmails).toHaveBeenCalled())
    expect(screen.getByRole('switch', { name: 'Send order workflow emails' })).toBeChecked()
  })

  it('shows the setting read-only without the edit key', async () => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_EMAIL_SETTINGS_VIEW]))
    renderWithProviders(<EmailSettingsPage />)

    expect(await screen.findByRole('switch', { name: 'Send order workflow emails' })).toBeDisabled()
  })

  it('says what failed, with a retry, when the setting cannot be loaded', async () => {
    getEmailSettings.mockRejectedValue(new Error('Network down'))
    renderWithProviders(<EmailSettingsPage />)

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
