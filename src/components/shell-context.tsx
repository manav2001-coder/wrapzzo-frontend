import * as React from 'react'

/**
 * Which signed-in session the app shell is serving. Wrapzzo has two separate logins -- company
 * and platform users (`auth`) and vendors (`vendorAuth`), with their own tokens and refresh -- but
 * one shell. The route tree mounts `<AppLayout portal="…">` once per portal, and everything in the
 * chrome (nav tree, account menu, command palette, logo link) reads the session from here instead
 * of guessing from the URL.
 */
export type Portal = 'app' | 'vendor'

export interface ShellSession {
  portal: Portal
  /** Where the logo and "back to dashboard" go. */
  homePath: string
  email: string | null
  /** Settings route for this portal. */
  settingsPath: string
  signOut: () => void
}

const ShellContext = React.createContext<ShellSession | null>(null)

export function ShellProvider({ value, children }: { value: ShellSession; children: React.ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

/** Throws outside the shell: a header widget rendered without a session is a wiring bug. */
export function useShell(): ShellSession {
  const context = React.useContext(ShellContext)
  if (!context) throw new Error('useShell must be used within <ShellProvider>')
  return context
}
