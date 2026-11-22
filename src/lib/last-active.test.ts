import { describe, expect, it } from 'vitest'

import { matchesActivity, timeAgo } from './last-active'

const NOW = new Date('2026-11-22T12:00:00Z').getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const HOUR = 3_600_000
const DAY = 24 * HOUR

describe('matchesActivity', () => {
  it('picks the same people the server does for each preset', () => {
    const people = { today: ago(2 * HOUR), week: ago(5 * DAY), stale: ago(10 * DAY), gone: ago(45 * DAY), never: null }
    const who = (preset: Parameters<typeof matchesActivity>[0]) =>
      Object.entries(people).filter(([, at]) => matchesActivity(preset, at, NOW)).map(([name]) => name)

    expect(who('today')).toEqual(['today'])
    expect(who('week')).toEqual(['today', 'week'])
    expect(who('inactive7')).toEqual(['stale', 'gone'])
    expect(who('inactive30')).toEqual(['gone'])
    expect(who('never')).toEqual(['never'])
  })
})

describe('timeAgo', () => {
  it('says how long ago in plain words, and nothing for someone who never signed in', () => {
    expect(timeAgo(null, 'en', NOW)).toBeNull()
    expect(timeAgo(ago(30 * 1000), 'en', NOW)).toBe('now')
    expect(timeAgo(ago(5 * 60 * 1000), 'en', NOW)).toBe('5 minutes ago')
    expect(timeAgo(ago(3 * HOUR), 'en', NOW)).toBe('3 hours ago')
    expect(timeAgo(ago(3 * DAY), 'en', NOW)).toBe('3 days ago')
    expect(timeAgo(ago(60 * DAY), 'en', NOW)).toBe('2 months ago')
  })
})
