import { describe, expect, it } from 'vitest'

import { vendorOrder } from '@/modules/vendor/vendor-fixtures'
import { barcodeSvgOf, dispatchLabelOf, labelHtml, qrSvgOf } from './dispatch-label'

const t = (key: string) => key

describe('dispatch label', () => {
  it('prints the box-style fields: product, quantity, SAP code, HQ, doctor, M.Code, division and supplier', async () => {
    const order = vendorOrder({ divisionName: 'Entrone' })
    const html = labelHtml(dispatchLabelOf(order, 'Sky Print Solution'), await qrSvgOf('ORD-101'), barcodeSvgOf('ORD-101'), t)
    for (const text of ['Prescription Pad', '5 label.pieces', 'P-1001', 'Pune', 'Dr. Asha Shah', 'AM07', 'Entrone', 'Sky Print Solution', 'ORD-101', '<svg', '148mm 105mm']) {
      expect(html).toContain(text)
    }
    for (const key of ['label.product', 'label.quantity', 'label.sapCode', 'label.hq', 'label.drName', 'label.mCode', 'label.supplier', 'label.div']) {
      expect(html).toContain(key)
    }
  })

  it('leaves out a line that has no value, and the division box when the order has no division', () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder({ recipientPcode: null, amArea: null, divisionName: null }), 'Sky Print'), '', '', t)
    expect(html).not.toContain('label.sapCode')
    expect(html).not.toContain('label.hq')
    expect(html).not.toContain('label.div')
  })

  it('escapes markup in what it prints', () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder({ recipientName: 'Dr <b>' }), 'S&P'), '', '', t)
    expect(html).toContain('Dr &lt;b&gt;')
    expect(html).toContain('S&amp;P')
  })
})
