import ExcelJS from 'exceljs'
import type { BulkImportUserRow } from '@/api/users'
import { downloadBlob } from '@/lib/download'

// Generic on purpose -- works for any client's shape, not just a pharma-style
// Division/Zone/Region/Area rollout. Org Level 1 is required for every row;
// deeper levels can be left blank for a company with a shallower hierarchy.
export const ORG_LEVEL_COUNT = 4

export type EmployeeFieldKey =
  | 'name'
  | 'email'
  | 'mobile'
  | 'designation'
  | 'employeeCode'
  | 'reportsToEmail'
  | `orgLevel${1 | 2 | 3 | 4}`

export interface EmployeeFieldDef {
  key: EmployeeFieldKey
  label: string
  required: boolean
}

export const EMPLOYEE_FIELDS: EmployeeFieldDef[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'mobile', label: 'Mobile', required: true },
  { key: 'designation', label: 'Designation', required: true },
  { key: 'employeeCode', label: 'Employee Code', required: true },
  { key: 'reportsToEmail', label: 'Reports To Email', required: false },
  ...Array.from({ length: ORG_LEVEL_COUNT }, (_, i) => ({
    key: `orgLevel${i + 1}` as EmployeeFieldKey,
    label: `Org Level ${i + 1}`,
    required: i === 0,
  })),
]

export const EMPLOYEE_TEMPLATE_HEADERS = EMPLOYEE_FIELDS.map((field) => field.label)

/** field key -> the column header text to read it from in the uploaded sheet. */
export type ColumnMapping = Partial<Record<EmployeeFieldKey, string>>

export async function generateEmployeeTemplateBlob(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Employees')
  sheet.addRow(EMPLOYEE_TEMPLATE_HEADERS)
  sheet.getRow(1).font = { bold: true }
  sheet.columns = EMPLOYEE_TEMPLATE_HEADERS.map((header) => ({ header, width: Math.max(header.length + 4, 16) }))

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** Builds the roster template and saves it -- the Users and Import pages both offer it. */
export async function downloadEmployeeTemplate(): Promise<void> {
  downloadBlob(await generateEmployeeTemplateBlob(), 'wrapzzo-employee-template.xlsx')
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

/** Reads just the header row -- lets the caller offer a column-mapping step before committing to a full parse. */
export async function getWorkbookHeaders(file: File): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headers: string[] = []
  sheet.getRow(1).eachCell((cell) => {
    const text = cellText(cell.value)
    if (text) headers.push(text)
  })
  return headers
}

/** Matches our field labels against a client's sheet headers by exact (case-insensitive) name -- the fast path for anyone who used our template as-is. */
export function buildAutoMapping(headers: string[]): ColumnMapping {
  const byNormalized = new Map(headers.map((header) => [normalizeHeader(header), header]))
  const mapping: ColumnMapping = {}
  for (const field of EMPLOYEE_FIELDS) {
    const match = byNormalized.get(normalizeHeader(field.label))
    if (match) mapping[field.key] = match
  }
  return mapping
}

export function getUnmappedRequiredFields(mapping: ColumnMapping): EmployeeFieldDef[] {
  return EMPLOYEE_FIELDS.filter((field) => field.required && !mapping[field.key])
}

/**
 * Reads a client's roster sheet. `mapping` says which of the client's own column
 * headers holds each of our fields -- pass it when their sheet doesn't use our
 * template's exact header names (collected via a "map your columns" step).
 * Falls back to auto-matching our own header names when omitted.
 */
export async function parseEmployeeWorkbook(file: File, mapping?: ColumnMapping): Promise<ParsedEmployeeSheet> {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    return { rows: [], errors: ['This file has no worksheet to read.'] }
  }

  const columnIndexByHeader = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, colNumber) => {
    columnIndexByHeader.set(normalizeHeader(cell.value), colNumber)
  })

  const colByKey: Partial<Record<EmployeeFieldKey, number>> = {}
  for (const field of EMPLOYEE_FIELDS) {
    const headerText = mapping?.[field.key] ?? field.label
    const col = columnIndexByHeader.get(normalizeHeader(headerText))
    if (col) colByKey[field.key] = col
  }

  // Every field but "Reports To Email" is required -- someone always has to be
  // at the top of the org chart with no manager, so that one alone stays optional.
  const missingRequiredCols = EMPLOYEE_FIELDS.filter((field) => field.required && !colByKey[field.key])
  if (missingRequiredCols.length > 0) {
    return {
      rows: [],
      errors: [
        `This sheet is missing required column(s): ${missingRequiredCols.map((f) => f.label).join(', ')}. Map your columns below or download the template.`,
      ],
    }
  }

  const rows: BulkImportUserRow[] = []
  const errors: string[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const values: Partial<Record<EmployeeFieldKey, string>> = {}
    for (const field of EMPLOYEE_FIELDS) {
      const col = colByKey[field.key]
      values[field.key] = col ? cellText(row.getCell(col).value) : ''
    }

    const orgUnitPath = [values.orgLevel1, values.orgLevel2, values.orgLevel3, values.orgLevel4].filter(
      (v): v is string => !!v && v.length > 0,
    )

    const isBlankRow =
      !values.name &&
      !values.email &&
      !values.mobile &&
      !values.designation &&
      !values.employeeCode &&
      !values.reportsToEmail &&
      orgUnitPath.length === 0
    if (isBlankRow) return // a genuinely blank row -- skip silently

    const missing: string[] = []
    if (!values.name) missing.push('Name')
    if (!values.email) missing.push('Email')
    if (!values.mobile) missing.push('Mobile')
    if (!values.designation) missing.push('Designation')
    if (!values.employeeCode) missing.push('Employee Code')
    if (orgUnitPath.length === 0) missing.push('Org Level 1')
    if (missing.length > 0) {
      errors.push(`Row ${rowNumber}: missing required field(s): ${missing.join(', ')}.`)
      return
    }

    rows.push({
      name: values.name!,
      email: values.email!,
      mobile: values.mobile!,
      designation: values.designation!,
      employeeCode: values.employeeCode!,
      reportsToEmail: values.reportsToEmail || undefined,
      orgUnitPath,
    })
  })

  return { rows, errors }
}
