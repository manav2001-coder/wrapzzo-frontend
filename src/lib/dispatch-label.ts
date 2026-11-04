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
 * The parcel goes to the AM who raised the order (via the warehouse), and the AM hands it to the doctor -- so the AM is the
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
  return QRCode.toString(text, { type: 'svg', margin: 0, width: 96 })
}

export function labelHtml(label: DispatchLabel, qrSvg: string, t: (key: string) => string): string {
  const row = (name: string, value: string | number | null) =>
    value === null || value === '' ? '' : `<tr><th>${escapeHtml(t(name))}</th><td>${escapeHtml(String(value))}</td></tr>`
  const doctor = [label.doctorName, label.pcode ? `(${label.pcode})` : null].filter(Boolean).join(' ')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(label.displayId)}</title>
<style>
@page{size:A6;margin:6mm}
body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:3mm}
h1{font-size:20pt;margin:0}h2{font-size:10pt;margin:1mm 0 0;font-weight:normal}
.to{border:2px solid #000;padding:2mm 3mm;margin-bottom:3mm}.to p{margin:0 0 1mm;font-size:8pt;text-transform:uppercase;letter-spacing:.5pt}
.to strong{display:block;font-size:15pt}.to span{display:block;font-size:10pt}
table{border-collapse:collapse;width:100%;font-size:10pt}
th{text-align:left;vertical-align:top;width:26mm;padding:1mm 2mm 1mm 0;font-weight:bold}
td{padding:1mm 0}
.file{margin-top:3mm;font:8pt monospace;word-break:break-all}
</style></head><body>
<header><div><h1>${escapeHtml(label.displayId)}</h1><h2>${escapeHtml(label.company)}</h2></div>${qrSvg}</header>
<section class="to"><p>${escapeHtml(t('label.dispatchTo'))}</p><strong>${escapeHtml(label.amName)}${label.amCode ? ` (${escapeHtml(label.amCode)})` : ''}</strong>
${label.amArea ? `<span>${escapeHtml(label.amArea)}</span>` : ''}${label.amMobile ? `<span>${escapeHtml(label.amMobile)}</span>` : ''}</section>
<table>
${row('label.product', label.product)}
${row('label.quantity', label.quantity)}
${row('label.forDoctor', doctor)}
${row('label.clinic', label.clinic)}
${row('label.phone', label.phone)}
${row('label.doctorAddress', label.doctorAddress)}
</table>
${label.artworkFile ? `<p class="file">${escapeHtml(label.artworkFile)}</p>` : ''}
</body></html>`
}

/** Opens the browser's print dialog on the label alone (choose "Save as PDF" there to download it). */
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
