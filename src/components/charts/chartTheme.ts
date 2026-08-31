import { useAppSelector } from '@/app/hooks'
import { resolveTheme } from '@/lib/theme'

/** Shared Highcharts text/grid colors, kept in sync with the app's light/dark theme tokens. */
export function useChartTheme() {
  const themePreference = useAppSelector((state) => state.ui.theme)
  const dark = resolveTheme(themePreference) === 'dark'
  return {
    dark,
    textColor: dark ? '#cbd5e1' : '#475569',
    mutedColor: dark ? '#64748b' : '#94a3b8',
    gridColor: dark ? '#334155' : '#e2e8f0',
  }
}

/** A small, consistent palette for series that aren't status-coded (see statusColor for those). */
export const CHART_PALETTE = ['#6366f1', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6']
