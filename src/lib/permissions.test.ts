import { describe, expect, it } from 'vitest'

import { P, VIEW_ACTION } from './permissions'

describe('permission catalogue', () => {
  const keys = Object.values(P)

  it('mirrors the backend enum: 52 company actions and 17 platform ones', () => {
    expect(keys).toHaveLength(69)
    expect(keys.filter((key) => key.startsWith('platform_'))).toHaveLength(17)
  })

  it('names every key feature.action -- exactly two parts -- once', () => {
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/)
  })

  it('gives every module that has other actions a way to be read, except the action-only ones', () => {
    const modules = new Set(keys.map((key) => key.split('.')[0]))
    const withoutView = [...modules].filter((module) => !keys.includes(`${module}.${VIEW_ACTION}` as (typeof keys)[number]))
    // Artwork is read through orders; Quick Gift has only actions.
    expect(withoutView.sort()).toEqual(['artwork', 'quick_gift'])
  })
})
