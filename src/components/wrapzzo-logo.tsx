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
 * The Wrappzo lockup: the W mark on a light tile and a bold wordmark beside it.
 */
export function WrapzzoLogo({ variant = 'full', height = 28, tone = 'white', className }: WrapzzoLogoProps) {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="img" aria-label={t('a11y.logoAlt')}>
      <svg
        viewBox="0 0 1600 1600"
        width={height}
        height={height}
        className="shrink-0 rounded-md shadow-[0_0_14px_rgba(80,72,255,0.35)]"
        aria-hidden="true"
      >
        <rect width="1600" height="1600" fill="#f7f7f7" />
        <path d="M275 500 550 1100 800 500 1050 1100 1290 570" fill="none" stroke="#5048ff" strokeWidth="120" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="1325" cy="500" r="100" fill="#5048ff" />
      </svg>
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
