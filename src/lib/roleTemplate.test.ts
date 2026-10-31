import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { ROLE_TEMPLATE_HEADERS, parseRoleWorkbook } from './roleTemplate'

async function sheetOf(headers: string[], rows: string[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Roles')
  sheet.addRow(headers)
  for (const row of rows) sheet.addRow(row)
  return new File([await workbook.xlsx.writeBuffer()], 'roles.xlsx')
}

describe('parseRoleWorkbook', () => {
  it('reads a name and an optional description per row', async () => {
    const { rows, errors } = await parseRoleWorkbook(await sheetOf(ROLE_TEMPLATE_HEADERS, [['MR', 'Medical Representative'], ['ZBM', '']]))
    expect(errors).toEqual([])
    expect(rows).toEqual([{ name: 'MR', description: 'Medical Representative' }, { name: 'ZBM' }])
  })

  it('accepts a sheet with only a Name column, in any header case', async () => {
    const { rows } = await parseRoleWorkbook(await sheetOf(['name'], [['RM']]))
    expect(rows).toEqual([{ name: 'RM' }])
  })

  it('skips blank rows and reports a description with no name', async () => {
    const { rows, errors } = await parseRoleWorkbook(await sheetOf(ROLE_TEMPLATE_HEADERS, [['', ''], ['', 'orphan'], ['ABM', '']]))
    expect(rows).toEqual([{ name: 'ABM' }])
    expect(errors).toEqual(['Row 3: the role needs a name.'])
  })

  it('refuses a sheet with no Name column', async () => {
    const { rows, errors } = await parseRoleWorkbook(await sheetOf(['Title'], [['MR']]))
    expect(rows).toEqual([])
    expect(errors).toEqual(['The sheet needs a "Name" column.'])
  })
})
