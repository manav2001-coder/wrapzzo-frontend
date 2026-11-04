import { describe, expect, it } from 'vitest'

import { vendorOrder } from '@/modules/vendor/vendor-fixtures'
import { dispatchLabelOf, labelHtml, qrSvgOf } from './dispatch-label'

const t = (key: string) => key

describe('dispatch label', () => {
  it('carries the doctor, pcode, AM, product and artwork file', async () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder(), 'P-1001_AM07_v2.pdf'), await qrSvgOf('ORD-101'), t)
    for (const text of ['ORD-101', 'Prescription Pad', 'Dr. Asha Shah (P-1001)', 'Ravi Kumar (AM07)', '12 MG Road, Pune', 'P-1001_AM07_v2.pdf', '<svg']) {
      expect(html).toContain(text)
    }
    expect(html).toContain('label.shipTo')
  })

  it('ships to the warehouse when the order goes through one, and escapes markup', () => {
    const order = vendorOrder({ shipToWarehouseName: 'Pune <WH>', shipToWarehouseAddress: 'Hinjewadi' })
    const html = labelHtml(dispatchLabelOf(order, null), '', t)
    expect(html).toContain('label.shipToWarehouse')
    expect(html).toContain('Pune &lt;WH&gt;, Hinjewadi')
  })
})
