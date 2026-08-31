import type Highcharts from 'highcharts'
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
    cardBg: dark ? '#14171e' : '#ffffff',
  }
}

/** A small, consistent palette for series that aren't status-coded (see statusColor for those). */
export const CHART_PALETTE = ['#6366f1', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6']

/** Builds a top-to-bottom Highcharts linearGradient fading a hex color to transparent -- used for areaspline fills. */
export function fadeGradient(color: string): Highcharts.GradientColorObject {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, hexToRgba(color, 0.35)],
      [1, hexToRgba(color, 0)],
    ],
  }
}

/** Builds a left-to-right Highcharts linearGradient from a hex color to a lighter tint of itself -- used for bar fills. */
export function barGradient(color: string): Highcharts.GradientColorObject {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 1, y2: 0 },
    stops: [
      [0, hexToRgba(color, 0.75)],
      [1, color],
    ],
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
