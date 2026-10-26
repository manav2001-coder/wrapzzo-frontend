import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { afterEach, describe, expect, it } from 'vitest'

import { i18next, renderWithProviders, screen } from '@/test/test-utils'
import SettingsPage from './Settings'

function renderSettings() {
  return renderWithProviders(
    <ThemeProvider attribute="class" storageKey="wrapzzo.theme" defaultTheme="system" enableSystem>
      <SettingsPage />
    </ThemeProvider>,
  )
}

describe('SettingsPage', () => {
  afterEach(() => {
    void i18next.changeLanguage('en')
  })

  it('switches the theme and marks the chosen mode', async () => {
    renderSettings()
    await userEvent.click(await screen.findByRole('button', { name: 'Dark' }))
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('wrapzzo.theme')).toBe('dark')
  })

  it('applies a language the moment it is picked', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'हिन्दी' }))
    expect(await screen.findByRole('heading', { name: 'सेटिंग्स' })).toBeInTheDocument()
  })
})
