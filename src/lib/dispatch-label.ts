import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

import type { VendorOrder } from '@/api/vendorOrders'
import { UserFacingError } from '@/lib/user-facing-error'

/**
 * What the parcel's sticker prints, in the box layout the franchise's packers already use: product, quantity, the doctor's
 * code and name, the headquarters, the AM's code, the division and the supplier. (PO number, box range, serial and total
 * boxes are not stored, so they are not on it.)
 */
export interface DispatchLabel {
  displayId: string
  product: string
  quantity: number
  /** SAP CODE -- the AM's employee code (the SAP code is their employee code). */
  sapCode: string | null
  /** DR. NAME */
  doctorName: string | null
  /** H.Q. NAME -- the AM's area. */
  hq: string | null
  /** M.CODE -- the doctor's pcode. */
  mCode: string | null
  division: string | null
  /** SUPPLIER -- the vendor making the parcel. */
  supplier: string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function dispatchLabelOf(order: VendorOrder, supplier: string): DispatchLabel {
  return {
    displayId: order.displayId,
    product: order.giftName ?? '',
    quantity: order.quantity,
    sapCode: order.amCode,
    doctorName: order.recipientName,
    hq: order.amArea,
    mCode: order.recipientPcode,
    division: order.divisionName,
    supplier,
  }
}

/** The QR carries the order number, so Ops can scan a parcel and find the order. */
export async function qrSvgOf(text: string): Promise<string> {
  return QRCode.toString(text, { type: 'svg', margin: 0, width: 110 })
}

/** A Code 128 barcode of the same text, as SVG -- for a handheld scanner. */
export function barcodeSvgOf(text: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, text, { format: 'CODE128', displayValue: false, margin: 0, height: 34, width: 2 })
  return svg.outerHTML
}

/** The box-style sticker: a double frame, one "Name : value" line per field, the SAP code large, the division in a box. */
export function labelHtml(label: DispatchLabel, qrSvg: string, barcodeSvg: string, t: (key: string) => string): string {
  const e = escapeHtml
  const row = (name: string, value: string | number | null, big = false) =>
    value === null || value === '' ? '' : `<div class="r${big ? ' big' : ''}"><span class="k">${e(t(name))}</span><span class="c">:</span><span class="v">${e(String(value))}</span></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(label.displayId)}</title>
<style>
@page{size:148mm 105mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;width:148mm;height:105mm}
body{font-family:Arial,Helvetica,sans-serif;color:#000;padding:4mm}
.outer{width:100%;height:100%;border:.5mm solid #000;padding:1.2mm}
.inner{width:100%;height:100%;border:.35mm solid #000;padding:4mm 5mm 3mm;display:flex;flex-direction:column}
.rows{display:flex;flex-direction:column;gap:2.2mm}
.r{display:flex;align-items:baseline;font-size:12.5pt;line-height:1.2}
.r .k{width:33mm;flex:none;text-transform:uppercase;font-weight:normal}
.r .c{width:4mm;flex:none}
.r .v{flex:1;min-width:0;overflow-wrap:anywhere;font-weight:bold}
.r.big .v{font-size:24pt;line-height:1}
.foot{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:4mm}
.scan{display:flex;align-items:flex-end;gap:3mm}
.qr{width:17mm;height:17mm;flex:none}.qr svg{width:100%;height:100%}
.ids{font-size:8pt;line-height:1.3}.ids b{display:block;font-size:11pt}
.ids svg{display:block;height:7mm;width:42mm;margin-top:1mm}
.div{border:.5mm solid #000;min-width:42mm;text-align:center;padding:1mm 3mm 2mm}
.div small{display:block;font-size:8pt;font-weight:bold;border-bottom:.35mm solid #000;margin:0 -3mm 1.5mm;padding-bottom:.8mm}
.div b{font-size:19pt;text-transform:uppercase}
</style></head><body>
<div class="outer"><div class="inner">
  <div class="rows">
    ${row('label.product', label.product)}
    ${row('label.quantity', `${label.quantity} ${t('label.pieces')}`)}
    ${row('label.sapCode', label.sapCode, true)}
    ${row('label.hq', label.hq)}
    ${row('label.drName', label.doctorName)}
    ${row('label.mCode', label.mCode)}
    ${row('label.supplier', label.supplier)}
  </div>
  <div class="foot">
    <div class="scan"><div class="qr">${qrSvg}</div><div class="ids"><b>${e(label.displayId)}</b>${barcodeSvg}</div></div>
    ${label.division ? `<div class="div"><small>${e(t('label.div'))}</small><b>${e(label.division)}</b></div>` : ''}
  </div>
</div></div>
</body></html>`
}

/** Opens the browser's print dialog on the label alone (an A6 landscape sticker, 148 x 105 mm) (choose "Save as PDF" there to download it). */
export function printLabel(html: string): void {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc || !frame.contentWindow) {
    frame.remove()
    throw new UserFacingError('The label could not be opened for printing: this browser blocked the print frame.')
  }
  doc.open()
  doc.write(html)
  doc.close()
  frame.contentWindow.onafterprint = () => frame.remove()
  frame.contentWindow.focus()
  frame.contentWindow.print()
}
