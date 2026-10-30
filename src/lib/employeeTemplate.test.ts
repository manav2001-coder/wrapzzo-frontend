import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { EMPLOYEE_TEMPLATE_HEADERS, parseEmployeeWorkbook } from './employeeTemplate'

async function sheetOf(rows: string[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Employees')
  sheet.addRow(EMPLOYEE_TEMPLATE_HEADERS)
  for (const row of rows) sheet.addRow(row)
  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer], 'roster.xlsx')
}

const person = (email: string, ...orgLevels: string[]) => ['Asha', email, '9999999999', 'Manager', 'E1', '', ...orgLevels]

describe('parseEmployeeWorkbook -- whole-company placement', () => {
  it('reads ALL in Org Level 1 as a placement, not a unit name', async () => {
    const { rows, errors } = await parseEmployeeWorkbook(await sheetOf([person('a@x.in', 'ALL')]))
    expect(errors).toEqual([])
    expect(rows[0].orgUnitPath).toEqual(['ALL'])
  })

  it('rejects ALL with deeper levels filled in', async () => {
    const { rows, errors } = await parseEmployeeWorkbook(await sheetOf([person('a@x.in', 'all', 'North')]))
    expect(rows).toEqual([])
    expect(errors).toEqual(['Row 2: ALL in Org Level 1 means the whole company -- leave the other levels empty.'])
  })

  it('still requires Org Level 1 -- a blank never means the whole company', async () => {
    const { errors } = await parseEmployeeWorkbook(await sheetOf([person('a@x.in')]))
    expect(errors[0]).toContain('Org Level 1')
  })
})
