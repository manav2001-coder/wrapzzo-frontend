import { describe, expect, it } from 'vitest'

import { photoProblem, squareCrop } from './profile-photo'

describe('squareCrop', () => {
  it('takes the middle of a wide picture', () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 })
  })
  it('takes the middle of a tall picture', () => {
    expect(squareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000 })
  })
  it('keeps a square one whole', () => {
    expect(squareCrop(800, 800)).toEqual({ sx: 0, sy: 0, side: 800 })
  })
})

describe('photoProblem', () => {
  it('accepts a JPEG or PNG of a sensible size', () => {
    expect(photoProblem({ type: 'image/jpeg', size: 4_000_000 })).toBeNull()
    expect(photoProblem({ type: 'image/png', size: 1_000 })).toBeNull()
  })
  it('refuses another kind of file', () => {
    expect(photoProblem({ type: 'application/pdf', size: 1_000 })).toBe('type')
    expect(photoProblem({ type: 'image/gif', size: 1_000 })).toBe('type')
  })
  it('refuses a huge one', () => {
    expect(photoProblem({ type: 'image/jpeg', size: 20_000_000 })).toBe('size')
  })
})
