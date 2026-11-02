import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { DOCTOR_TEMPLATE_HEADERS, parseDoctorWorkbook } from './doctorTemplate'

async function sheetOf(headers: string[], rows: (string | Date)[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Doctors')
  sheet.addRow(headers)
  for (const row of rows) sheet.addRow(row)
  return new File([await workbook.xlsx.writeBuffer()], 'doctors.xlsx')
}

describe('parseDoctorWorkbook', () => {
  it('reads each doctor with their print details', async () => {
    const { rows, errors } = await parseDoctorWorkbook(
      await sheetOf(DOCTOR_TEMPLATE_HEADERS, [['Dr Asha Shah', '9800000001', 'a@x.com', 'MG Road', '1980-10-28', 'MH-1', 'MBBS', 'Cardiology', 'Shah Clinic']]),
    )
    expect(errors).toEqual([])
    expect(rows).toEqual([
      {
        name: 'Dr Asha Shah',
        phone: '9800000001',
        email: 'a@x.com',
        address: 'MG Road',
        dateOfBirth: '1980-10-28',
        doctor: { registrationNumber: 'MH-1', qualification: 'MBBS', speciality: 'Cardiology', clinicName: 'Shah Clinic' },
      },
    ])
  })

  it('accepts a client sheet using common column names such as PCODE and Mobile', async () => {
    const { rows, errors } = await parseDoctorWorkbook(await sheetOf(['Dr. Name', 'Mobile', 'PCODE', 'Specialty'], [['Dr Ravi', '9800000002', '576458', 'GP']]))
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ name: 'Dr Ravi', phone: '9800000002', doctor: { registrationNumber: '576458' } })
  })

  it('reports a row with no phone and skips blank rows', async () => {
    const { rows, errors } = await parseDoctorWorkbook(await sheetOf(['Doctor Name', 'Phone'], [['', ''], ['Dr No Phone', ''], ['Dr Ok', '9800000003']]))
    expect(rows.map((r) => r.name)).toEqual(['Dr Ok'])
    expect(errors).toEqual(['Row 3: missing Phone.'])
  })

  it('refuses a sheet with no phone column', async () => {
    const { rows, errors } = await parseDoctorWorkbook(await sheetOf(['Doctor Name'], [['Dr A']]))
    expect(rows).toEqual([])
    expect(errors[0]).toContain('"Phone"')
  })
})
