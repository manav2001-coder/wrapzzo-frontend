import { describe, expect, it } from 'vitest'

import { vendorOrder } from '@/modules/vendor/vendor-fixtures'
import { ALL_DIVISIONS, divisionsOf, inDivision, mergeDivisions } from './vendor-division'

const orders = [
  vendorOrder({ id: 'a', divisionId: 'd1', divisionName: 'Summit' }),
  vendorOrder({ id: 'b', divisionId: 'd1', divisionName: 'Summit' }),
  vendorOrder({ id: 'c', divisionId: 'd2', divisionName: 'Apex' }),
  vendorOrder({ id: 'd' }),
]

describe('vendor division filter', () => {
  it('lists the divisions the orders come from, busiest first, skipping orders placed in none', () => {
    expect(divisionsOf(orders)).toEqual([
      { id: 'd1', name: 'Summit', count: 2 },
      { id: 'd2', name: 'Apex', count: 1 },
    ])
  })

  it('narrows to one division, or shows everything for all', () => {
    expect(inDivision(orders, 'd2').map((o) => o.id)).toEqual(['c'])
    expect(inDivision(orders, ALL_DIVISIONS)).toHaveLength(4)
  })

  it('a division with no orders shows none -- it is not "all"', () => {
    expect(inDivision(orders, 'd3')).toEqual([])
  })

  it('offers every mapped division, with a zero where no order has come yet, plus any an order came from', () => {
    const merged = mergeDivisions(
      [{ id: 'd1', name: 'Summit' }, { id: 'd9', name: 'ZENOVI' }],
      divisionsOf(orders),
    )
    expect(merged).toEqual([
      { id: 'd1', name: 'Summit', count: 2 },
      { id: 'd2', name: 'Apex', count: 1 },
      { id: 'd9', name: 'ZENOVI', count: 0 },
    ])
  })
})
