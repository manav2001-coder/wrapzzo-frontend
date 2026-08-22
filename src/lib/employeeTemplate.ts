import ExcelJS from 'exceljs'
import type { BulkImportUserRow } from '@/api/users'

// Generic on purpose -- works for any client's shape, not just a pharma-style
// Division/Zone/Region/Area rollout. A company with no named hierarchy just
// leaves the Org Level columns blank; reportsTo alone still builds their org chart.
export const ORG_LEVEL_COUNT = 4

export const EMPLOYEE_TEMPLATE_HEADERS = [
  'Name',
  'Email',
  'Mobile',
  'Designation',
  'Employee Code',
  'Reports To Email',
  ...Array.from({ length: ORG_LEVEL_COUNT }, (_, i) => `Org Level ${i + 1}`),
]

export async function generateEmployeeTemplateBlob(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Employees')
  sheet.addRow(EMPLOYEE_TEMPLATE_HEADERS)
  sheet.getRow(1).font = { bold: true }
  sheet.columns = EMPLOYEE_TEMPLATE_HEADERS.map((header) => ({ header, width: Math.max(header.length + 4, 16) }))

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export interface ParsedEmployeeSheet {
  rows: BulkImportUserRow[]
  errors: string[]
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '').trim()
  }
  return String(value).trim()
}

/** Reads the client's filled-in template -- matches columns by header name, not position, so a reordered sheet still works. */
export async function parseEmployeeWorkbook(file: File): Promise<ParsedEmployeeSheet> {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    return { rows: [], errors: ['This file has no worksheet to read.'] }
  }

  const headerRow = sheet.getRow(1)
  const columnIndexByHeader = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    columnIndexByHeader.set(normalizeHeader(cell.value), colNumber)
  })

  const nameCol = columnIndexByHeader.get('name')
  const emailCol = columnIndexByHeader.get('email')
  if (!nameCol || !emailCol) {
    return { rows: [], errors: ['This sheet is missing required "Name" and/or "Email" columns -- download the template to check the expected headers.'] }
  }
  const mobileCol = columnIndexByHeader.get('mobile')
  const designationCol = columnIndexByHeader.get('designation')
  const employeeCodeCol = columnIndexByHeader.get('employee code')
  const reportsToCol = columnIndexByHeader.get('reports to email')
  const orgLevelCols = Array.from({ length: ORG_LEVEL_COUNT }, (_, i) => columnIndexByHeader.get(`org level ${i + 1}`))

  const rows: BulkImportUserRow[] = []
  const errors: string[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const name = cellText(row.getCell(nameCol).value)
    const email = cellText(row.getCell(emailCol).value)
    if (!name && !email) return // a genuinely blank row -- skip silently

    if (!name || !email) {
      errors.push(`Row ${rowNumber}: both Name and Email are required.`)
      return
    }

    const orgUnitPath = orgLevelCols.map((col) => (col ? cellText(row.getCell(col).value) : '')).filter((v) => v.length > 0)

    rows.push({
      name,
      email,
      mobile: mobileCol ? cellText(row.getCell(mobileCol).value) || undefined : undefined,
      designation: designationCol ? cellText(row.getCell(designationCol).value) || undefined : undefined,
      employeeCode: employeeCodeCol ? cellText(row.getCell(employeeCodeCol).value) || undefined : undefined,
      reportsToEmail: reportsToCol ? cellText(row.getCell(reportsToCol).value) || undefined : undefined,
      orgUnitPath: orgUnitPath.length > 0 ? orgUnitPath : undefined,
    })
  })

  return { rows, errors }
}
