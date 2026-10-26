import type { ReactNode } from 'react'

import { WrapzzoLogo } from '@/components/wrapzzo-logo'

/**
 * The chrome every signed-out screen outside the sign-in hero shares: the wordmark over a centred
 * narrow column (MobixFL's `AuthShell`). One component, so a change to the logo or column width is
 * one edit, not one per page.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <WrapzzoLogo tone="auto" height={36} className="mb-6" />
          {children}
        </div>
      </div>
    </div>
  )
}
