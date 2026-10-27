import { Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface WrapzzoLogoProps {
  /** "mark": the gift tile only (collapsed rail). "full": tile plus wordmark. */
  variant?: 'mark' | 'full'
  /** px height of the tile; the wordmark scales with it. */
  height?: number
  /** "white": white wordmark for the dark-navy sidebar and hero. "auto": follows the theme. */
  tone?: 'white' | 'auto'
  className?: string
}

/**
 * The Wrappzo lockup, drawn in the MobixFL shell's style: a primary-blue tile carrying the mark
 * (with the same soft blue glow MobixFL's logo has on the navy rail) and a bold wordmark beside it.
 */
export function WrapzzoLogo({ variant = 'full', height = 28, tone = 'white', className }: WrapzzoLogoProps) {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="img" aria-label={t('a11y.logoAlt')}>
      <span
        className="flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-sidebar-accent text-white shadow-[0_0_14px_rgba(56,132,255,0.5)]"
        style={{ width: height, height }}
        aria-hidden="true"
      >
        <Gift style={{ width: height * 0.58, height: height * 0.58 }} strokeWidth={2.25} />
      </span>
      {variant === 'full' && (
        <span
          aria-hidden="true"
          className={cn('font-extrabold tracking-tight', tone === 'white' ? 'text-white' : 'text-foreground')}
          style={{ fontSize: height * 0.68, lineHeight: 1 }}
        >
          {t('app.name')}
        </span>
      )}
    </span>
  )
}
