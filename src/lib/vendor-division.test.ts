import { describe, expect, it } from 'vitest'

import { vendorOrder } from '@/modules/vendor/vendor-fixtures'
import { ALL_DIVISIONS, divisionsOf, inDivision } from './vendor-division'

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

  it('shows everything when the saved division has no orders any more', () => {
    expect(inDivision(orders, 'gone')).toHaveLength(4)
  })
})
