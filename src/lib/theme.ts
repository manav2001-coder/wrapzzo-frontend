import darkThemeHref from 'primereact/resources/themes/lara-dark-indigo/theme.css?url'
import type { ThemePreference } from '@/features/ui/uiSlice'

export type ResolvedTheme = 'light' | 'dark'

const DARK_LINK_ID = 'prime-theme-dark'

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

/** Sets the `data-theme` attribute our CSS tokens key off of, and swaps in PrimeReact's dark theme stylesheet (its component base styles -- Dialog, DataTable, Menu, etc. -- are baked into the theme file itself, not CSS variables). */
export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)

  const existing = document.getElementById(DARK_LINK_ID) as HTMLLinkElement | null
  if (resolved === 'dark') {
    if (!existing) {
      const link = document.createElement('link')
      link.id = DARK_LINK_ID
      link.rel = 'stylesheet'
      link.href = darkThemeHref
      document.head.appendChild(link)
    }
  } else {
    existing?.remove()
  }
}
