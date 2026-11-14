import ExcelJS from 'exceljs'
import type { CreateRecipientInput } from '@/api/recipients'
import { downloadBlob } from '@/lib/download'
import { cellText, normalizeHeader } from '@/lib/employeeTemplate'

type DoctorField = 'pcode' | 'name' | 'phone' | 'email' | 'address' | 'qualification' | 'speciality' | 'clinicName'

const DOCTOR_FIELDS: { key: DoctorField; label: string; required: boolean }[] = [
  { key: 'pcode', label: 'Pcode', required: true },
  { key: 'name', label: 'Doctor Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'address', label: 'Clinic Address', required: false },
  { key: 'qualification', label: 'Qualification', required: false },
  { key: 'speciality', label: 'Speciality', required: false },
  { key: 'clinicName', label: 'Clinic / Hospital', required: false },
]

export const DOCTOR_TEMPLATE_HEADERS = DOCTOR_FIELDS.map((field) => field.label)

/** Other names a sheet commonly uses for the same column, so a client's own list needs no renaming. */
const ALIASES: Partial<Record<DoctorField, string[]>> = {
  pcode: ['p code', 'p-code', 'doctor code', 'dr code'],
  name: ['name', 'dr name', 'dr. name', 'doctor'],
  phone: ['mobile', 'phone number', 'mobile number', 'contact'],
  address: ['address'],
  clinicName: ['clinic', 'hospital', 'clinic name'],
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Builds the doctors template and saves it -- the Doctors screen offers it beside the upload. */
export async function downloadDoctorTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Doctors')
  sheet.addRow(DOCTOR_TEMPLATE_HEADERS)
  sheet.getRow(1).font = { bold: true }
  sheet.columns = DOCTOR_TEMPLATE_HEADERS.map((header) => ({ header, width: Math.max(header.length + 4, 18) }))
  downloadBlob(new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_TYPE }), 'wrappzo-doctors-template.xlsx')
}

export interface ParsedDoctorSheet {
  rows: CreateRecipientInput[]
  errors: string[]
}

/** Reads a doctors sheet, one doctor per row; Pcode, Doctor Name and Phone are required. */
export async function parseDoctorWorkbook(file: File): Promise<ParsedDoctorSheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: ['This file has no worksheet to read.'] }

  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(normalizeHeader(cell.value), column))
  const columnOf = (field: (typeof DOCTOR_FIELDS)[number]): number | undefined =>
    [field.label, ...(ALIASES[field.key] ?? [])].map(normalizeHeader).map((name) => columns.get(name)).find((c) => c !== undefined)

  const col = Object.fromEntries(DOCTOR_FIELDS.map((field) => [field.key, columnOf(field)])) as Record<DoctorField, number | undefined>
  const missing = DOCTOR_FIELDS.filter((field) => field.required && !col[field.key])
  if (missing.length > 0) {
    return { rows: [], errors: [`The sheet needs ${missing.map((f) => `a "${f.label}"`).join(' and ')} column. Download the template to see the layout.`] }
  }

  const text = (row: ExcelJS.Row, field: DoctorField) => (col[field] ? cellText(row.getCell(col[field]!).value) : '')
  const rows: CreateRecipientInput[] = []
  const errors: string[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const values = Object.fromEntries(DOCTOR_FIELDS.map((f) => [f.key, text(row, f.key)])) as Record<DoctorField, string>
    if (Object.values(values).every((v) => !v)) return
    const absent = DOCTOR_FIELDS.filter((f) => f.required && !values[f.key]).map((f) => f.label)
    if (absent.length > 0) {
      errors.push(`Row ${rowNumber}: missing ${absent.join(' and ')}.`)
      return
    }
    rows.push({
      pcode: values.pcode,
      name: values.name,
      phone: values.phone,
      ...(values.email && { email: values.email }),
      ...(values.address && { address: values.address }),
      doctor: {
        qualification: values.qualification || null,
        speciality: values.speciality || null,
        clinicName: values.clinicName || null,
      },
    })
  })
  if (rows.length === 0 && errors.length === 0) errors.push('The sheet has no doctors in it.')
  return { rows, errors }
}
