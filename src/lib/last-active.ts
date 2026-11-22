/**
 * "Last active" for the Super Admin's Users and Vendors screens. The server stamps the time at sign-in and each time the app
 * renews its 15-minute sign-in, so it is accurate to about 15 minutes of use. A null time means they have never signed in.
 */
export const ACTIVITY_PRESETS = ['today', 'week', 'inactive7', 'inactive30', 'never'] as const
export type ActivityPreset = (typeof ACTIVITY_PRESETS)[number]

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** The same rule the server applies to the Users filter, for the Vendors list (which is filtered here, not on the server). */
export function matchesActivity(preset: ActivityPreset, lastActiveAt: string | null | undefined, now: number = Date.now()): boolean {
  if (preset === 'never') return !lastActiveAt
  if (!lastActiveAt) return false
  const age = now - new Date(lastActiveAt).getTime()
  switch (preset) {
    case 'today':
      return age <= DAY
    case 'week':
      return age <= 7 * DAY
    case 'inactive7':
      return age > 7 * DAY
    case 'inactive30':
      return age > 30 * DAY
  }
}

/** "5 minutes ago", "3 days ago" -- in the person's language; null when they have never been active. */
export function timeAgo(lastActiveAt: string | null | undefined, locale: string, now: number = Date.now()): string | null {
  if (!lastActiveAt) return null
  const seconds = Math.round((new Date(lastActiveAt).getTime() - now) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(seconds)
  if (abs < 60) return format.format(0, 'second')
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour')
  if (abs < 30 * 86400) return format.format(Math.round(seconds / 86400), 'day')
  if (abs < 365 * 86400) return format.format(Math.round(seconds / (30 * 86400)), 'month')
  return format.format(Math.round(seconds / (365 * 86400)), 'year')
}
