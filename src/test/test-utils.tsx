import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { Provider as ReduxProvider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'

import { makeStore, type RootState } from '@/app/store'
import { PermissionProvider } from '@/components/permission-provider'
import { type ShellSession, ShellProvider } from '@/components/shell-context'
import { SidebarProvider } from '@/components/sidebar-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18next, initI18n, type Locale } from '@/lib/i18n'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial history entry, for components that read router state. */
  route?: string
  /** Render in a specific language. Defaults to English so assertions can match literals. */
  locale?: Locale
  /** Redux state to start from, e.g. a signed-in session. */
  preloadedState?: Partial<RootState>
  /** Overrides for the shell session (portal, email, signOut…). */
  shell?: Partial<ShellSession>
}

export const DEFAULT_SHELL: ShellSession = {
  portal: 'app',
  homePath: '/',
  settingsPath: '/settings',
  email: 'priya.sharma@acme.com',
  signOut: () => {},
}

/**
 * Render a component wrapped in the app's client providers (Redux, TanStack Query, i18next,
 * permissions, Radix tooltips, sidebar state, the shell session and a MemoryRouter). Mirrors
 * `Providers` (src/components/providers.tsx) minus next-themes -- extend both together.
 *
 * `PermissionProvider` reads `GET /api/auth/me` through `useCurrentUser`, so a test that cares
 * about a specific permission set mocks `@/hooks/use-current-user`.
 *
 * The language is pinned to English by default and reset on every render, so one test switching
 * locale cannot leak into the next (i18next is module-level singleton state).
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', locale = 'en', preloadedState, shell, ...options }: Options = {},
) {
  const instance = initI18n()
  if (instance.language !== locale) void instance.changeLanguage(locale)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const store = makeStore(preloadedState)
  const session = { ...DEFAULT_SHELL, ...shell }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={instance}>
              <PermissionProvider>
                <TooltipProvider delayDuration={0}>
                  <SidebarProvider>
                    <ShellProvider value={session}>{children}</ShellProvider>
                  </SidebarProvider>
                </TooltipProvider>
              </PermissionProvider>
            </I18nextProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </MemoryRouter>
    )
  }
  return { ...render(ui, { wrapper: Wrapper, ...options }), store, queryClient }
}

/** A promise a test resolves by hand (`Promise.withResolvers`, without needing ES2024). */
export function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export { i18next }
export * from '@testing-library/react'
