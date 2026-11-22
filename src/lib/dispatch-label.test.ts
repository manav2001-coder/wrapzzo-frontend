import { describe, expect, it } from 'vitest'

import { vendorOrder } from '@/modules/vendor/vendor-fixtures'
import { barcodeSvgOf, dispatchLabelOf, labelHtml, qrSvgOf } from './dispatch-label'

const t = (key: string) => key

describe('dispatch label', () => {
  it('prints the box-style fields: product, quantity, SAP code (the AM\'s code), HQ, doctor, M.Code (the doctor\'s pcode), division and supplier', async () => {
    const order = vendorOrder({ divisionName: 'Entrone' })
    const html = labelHtml(dispatchLabelOf(order, 'Sky Print Solution'), await qrSvgOf('ORD-101'), barcodeSvgOf('ORD-101'), t)
    for (const text of ['Prescription Pad', '5 label.pieces', 'P-1001', 'Pune', 'Dr. Asha Shah', 'AM07', 'Entrone', 'Sky Print Solution', 'ORD-101', '<svg', '148mm 105mm']) {
      expect(html).toContain(text)
    }
    for (const key of ['label.product', 'label.quantity', 'label.sapCode', 'label.hq', 'label.drName', 'label.mCode', 'label.supplier', 'label.div']) {
      expect(html).toContain(key)
    }
  })

  it('puts the AM\'s code on the SAP CODE line and the doctor\'s pcode on the M.CODE line', () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder({ amCode: 'AM07', recipientPcode: 'P-1001' }), 'S'), '', '', t)
    expect(html).toMatch(/label\.sapCode<\/span><span class="c">:<\/span><span class="v">AM07</)
    expect(html).toMatch(/label\.mCode<\/span><span class="c">:<\/span><span class="v">P-1001</)
  })

  it('leaves out a line that has no value, and the division box when the order has no division', () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder({ amCode: null, recipientPcode: null, amArea: null, divisionName: null }), 'Sky Print'), '', '', t)
    expect(html).not.toContain('label.sapCode')
    expect(html).not.toContain('label.mCode')
    expect(html).not.toContain('label.hq')
    expect(html).not.toContain('label.div')
  })

  it('escapes markup in what it prints', () => {
    const html = labelHtml(dispatchLabelOf(vendorOrder({ recipientName: 'Dr <b>' }), 'S&P'), '', '', t)
    expect(html).toContain('Dr &lt;b&gt;')
    expect(html).toContain('S&amp;P')
  })
})
