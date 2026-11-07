import { describe, expect, it } from 'vitest'

import { mergeDivisions } from './vendor-division'

describe('vendor division filter', () => {
  it('offers every mapped division, with a zero where no order has come yet, plus any an order came from', () => {
    const merged = mergeDivisions(
      [
        { id: 'd1', name: 'Summit' },
        { id: 'd9', name: 'ZENOVI' },
      ],
      [
        { id: 'd1', name: 'Summit', count: 2 },
        { id: 'd2', name: 'Apex', count: 1 },
      ],
    )
    expect(merged).toEqual([
      { id: 'd1', name: 'Summit', count: 2 },
      { id: 'd2', name: 'Apex', count: 1 },
      { id: 'd9', name: 'ZENOVI', count: 0 },
    ])
  })

  it('lists the busiest division first, then by name', () => {
    const merged = mergeDivisions([], [
      { id: 'a', name: 'Beta', count: 1 },
      { id: 'b', name: 'Alpha', count: 1 },
      { id: 'c', name: 'Gamma', count: 5 },
    ])
    expect(merged.map((d) => d.name)).toEqual(['Gamma', 'Alpha', 'Beta'])
  })
})
