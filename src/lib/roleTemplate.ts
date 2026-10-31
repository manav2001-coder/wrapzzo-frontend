import ExcelJS from 'exceljs'
import type { BulkImportRoleRow } from '@/api/roles'
import { downloadBlob } from '@/lib/download'
import { cellText, normalizeHeader } from '@/lib/employeeTemplate'

export const ROLE_TEMPLATE_HEADERS = ['Name', 'Description']

/** Builds the roles template and saves it -- the Roles page offers it beside the import. */
export async function downloadRoleTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Roles')
  sheet.addRow(ROLE_TEMPLATE_HEADERS)
  sheet.getRow(1).font = { bold: true }
  sheet.columns = ROLE_TEMPLATE_HEADERS.map((header) => ({ header, width: header === 'Name' ? 24 : 52 }))
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'wrappzo-roles-template.xlsx')
}

export interface ParsedRoleSheet {
  rows: BulkImportRoleRow[]
  errors: string[]
}

/** Reads a roles sheet: a Name column (required) and an optional Description, one role per row. */
export async function parseRoleWorkbook(file: File): Promise<ParsedRoleSheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: ['This file has no worksheet to read.'] }

  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(normalizeHeader(cell.value), column))
  const nameColumn = columns.get('name')
  const descriptionColumn = columns.get('description')
  if (!nameColumn) return { rows: [], errors: ['The sheet needs a "Name" column.'] }

  const rows: BulkImportRoleRow[] = []
  const errors: string[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const name = cellText(row.getCell(nameColumn).value)
    const description = descriptionColumn ? cellText(row.getCell(descriptionColumn).value) : ''
    if (!name && !description) return
    if (!name) {
      errors.push(`Row ${rowNumber}: the role needs a name.`)
      return
    }
    rows.push({ name, ...(description && { description }) })
  })
  if (rows.length === 0 && errors.length === 0) errors.push('The sheet has no roles in it.')
  return { rows, errors }
}
