import { describe, expect, it } from 'vitest'

import { P, VIEW_ACTION } from './permissions'

describe('permission catalogue', () => {
  const keys = Object.values(P)

  it('mirrors the backend enum: 44 company actions and 20 platform ones', () => {
    expect(keys).toHaveLength(64)
    expect(keys.filter((key) => key.startsWith('platform_'))).toHaveLength(20)
  })

  it('names every key module.action, once', () => {
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(key).toMatch(/^[a-z_]+(\.[a-z_]+)+$/)
  })

  it('gives every module that has other actions a way to be read, except the action-only ones', () => {
    const modules = new Set(keys.map((key) => key.split('.')[0]))
    const withoutView = [...modules].filter((module) => !keys.includes(`${module}.${VIEW_ACTION}` as (typeof keys)[number]))
    // The Access Control keys (tbac.<screen>.<action>) are per-screen, with no module-level view.
    expect(withoutView.sort()).toEqual(['recipient_list', 'request', 'tbac'])
  })
})
