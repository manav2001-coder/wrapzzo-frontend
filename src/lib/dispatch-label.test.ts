import { describe, expect, it } from 'vitest'

import { vendorOrder } from '@/modules/vendor/vendor-fixtures'
import { dispatchLabelOf, labelHtml, qrSvgOf } from './dispatch-label'

const t = (key: string) => key

describe('dispatch label', () => {
  it('is addressed to the AM, and names the doctor it is for', async () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder(), 'P-1001_AM07_v2.pdf'), await qrSvgOf('ORD-101'), t)
    for (const text of ['ORD-101', 'Prescription Pad', 'label.dispatchTo', 'Ravi Kumar (AM07)', '9811111111', 'Pune', 'Dr. Asha Shah (P-1001)', 'P-1001_AM07_v2.pdf', '<svg']) {
      expect(html).toContain(text)
    }
  })

  it('escapes markup in what it prints', () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder({ amName: 'Ravi <b>' }), null), '', t)
    expect(html).toContain('Ravi &lt;b&gt;')
  })
})
