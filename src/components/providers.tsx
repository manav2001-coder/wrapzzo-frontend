import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'
import { Provider as ReduxProvider } from 'react-redux'

import { store } from '@/app/store'
import { PermissionProvider } from '@/components/permission-provider'
import { SidebarProvider } from '@/components/sidebar-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import { queryClient } from '@/lib/queryClient'

// At module scope, not in an effect: `useTranslation` needs an initialised instance on the first
// render, or the whole tree flashes raw keys.
const i18n = initI18n()

/**
 * Client-side context providers mounted once at the root, in MobixFL's order:
 * Theme → (Redux) → Query → I18n → Permission → Tooltip → Sidebar.
 *
 * `ThemeProvider` (next-themes) toggles the `.dark` class. Redux holds the two auth sessions the
 * API clients read. `PermissionProvider` needs the query client (it reads the profile query), so it
 * sits inside `QueryClientProvider` and above everything that gates. `TooltipProvider` is required
 * by Radix: the collapsed rail, `IconButton` and `Fab` all use tooltips. `SidebarProvider` holds the
 * desktop rail's collapsed state.
 *
 * Mirror any addition here in `renderWithProviders` (src/test/test-utils.tsx).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Keyed as before the redesign, so everyone keeps the light/dark choice they had already made.
    <ThemeProvider
      attribute="class"
      storageKey="wrapzzo.theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <PermissionProvider>
              <TooltipProvider delayDuration={200}>
                <SidebarProvider>{children}</SidebarProvider>
              </TooltipProvider>
            </PermissionProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </ThemeProvider>
  )
}
