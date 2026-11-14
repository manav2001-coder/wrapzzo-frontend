import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

import type { VendorOrder } from '@/api/vendorOrders'
import { UserFacingError } from '@/lib/user-facing-error'

/** The text of the label, line by line -- everything Ops needs to tell whose parcel it is and what is in it. */
export interface DispatchLabel {
  displayId: string
  product: string
  quantity: number
  doctorName: string | null
  pcode: string | null
  clinic: string | null
  phone: string | null
  doctorAddress: string | null
  amName: string
  amCode: string | null
  amMobile: string | null
  amArea: string | null
  company: string
  artworkFile: string | null
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * The parcel goes to the AM who raised the order, and the AM hands it to the doctor -- so the AM is the
 * addressee and the doctor is what is inside.
 */
export function dispatchLabelOf(order: VendorOrder, artworkFile: string | null): DispatchLabel {
  return {
    displayId: order.displayId,
    product: order.giftName ?? '',
    quantity: order.quantity,
    doctorName: order.recipientName,
    pcode: order.recipientPcode,
    clinic: order.doctor?.clinicName ?? null,
    phone: order.recipientPhone,
    doctorAddress: order.deliveryAddress,
    amName: order.amName,
    amCode: order.amCode,
    amMobile: order.amMobile,
    amArea: order.amArea,
    company: order.companyName,
    artworkFile,
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

export function labelHtml(label: DispatchLabel, qrSvg: string, barcodeSvg: string, t: (key: string) => string): string {
  const e = escapeHtml
  const field = (name: string, value: string | number | null) =>
    value === null || value === '' ? '' : `<div class="f"><small>${e(t(name))}</small><b>${e(String(value))}</b></div>`
  const doctor = [label.doctorName, label.pcode ? `(${label.pcode})` : null].filter(Boolean).join(' ')
  const am = [label.amName, label.amCode ? `(${label.amCode})` : null].filter(Boolean).join(' ')
  const amLine = [label.amArea, label.amMobile].filter(Boolean).join(' · ')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(label.displayId)}</title>
<style>
@page{size:100mm 70mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;width:100mm;height:70mm}
body{font-family:Arial,Helvetica,sans-serif;color:#000;padding:4mm 5mm;display:flex;flex-direction:column;gap:2mm}
small{display:block;font-size:6.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.4pt;color:#333}
.top{display:flex;justify-content:space-between;gap:4mm;border-bottom:.6mm solid #000;padding-bottom:2mm}
.id b{display:block;font-size:22pt;line-height:1.05}
.id span{font-size:8pt}
.to{margin-top:1.5mm}.to b{display:block;font-size:13pt;line-height:1.15}.to span{font-size:8.5pt}
.qr{width:22mm;height:22mm;flex:none}.qr svg{width:100%;height:100%}
.row{display:flex;gap:4mm}.row .f{flex:1;min-width:0}
.f b{display:block;font-size:9.5pt;line-height:1.15;overflow-wrap:anywhere}
.bar{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:3mm}
.bar svg{height:8mm;width:55mm}
.file{font:6.5pt monospace;max-width:34mm;overflow-wrap:anywhere;text-align:right}
</style></head><body>
<div class="top">
  <div><div class="id"><small>${e(t('label.order'))}</small><b>${e(label.displayId)}</b><span>${e(label.company)}</span></div>
  <div class="to"><small>${e(t('label.dispatchTo'))}</small><b>${e(am)}</b>${amLine ? `<span>${e(amLine)}</span>` : ''}</div></div>
  <div class="qr">${qrSvg}</div>
</div>
<div class="row">${field('label.forDoctor', doctor)}${field('label.clinic', label.clinic)}</div>
<div class="row">${field('label.product', label.product)}${field('label.quantity', label.quantity)}</div>
<div class="bar">${barcodeSvg}${label.artworkFile ? `<div class="file">${e(label.artworkFile)}</div>` : ''}</div>
</body></html>`
}

/** Opens the browser's print dialog on the label alone (a 100 x 70 mm sticker) (choose "Save as PDF" there to download it). */
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
