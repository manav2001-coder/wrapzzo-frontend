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
      await sheetOf(DOCTOR_TEMPLATE_HEADERS, [['P-1001', 'Dr Asha Shah', '9800000001', 'a@x.com', 'MG Road', 'MBBS', 'Cardiology', 'Shah Clinic']]),
    )
    expect(errors).toEqual([])
    expect(rows).toEqual([
      {
        pcode: 'P-1001',
        name: 'Dr Asha Shah',
        phone: '9800000001',
        email: 'a@x.com',
        address: 'MG Road',
        doctor: { qualification: 'MBBS', speciality: 'Cardiology', clinicName: 'Shah Clinic' },
      },
    ])
  })

  it('accepts a client sheet using common column names such as PCODE and Mobile', async () => {
    const { rows, errors } = await parseDoctorWorkbook(
      await sheetOf(['Dr. Name', 'Mobile', 'PCODE', 'Specialty'], [['Dr Ravi', '9800000002', '576458', 'GP']]),
    )
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ pcode: '576458', name: 'Dr Ravi', phone: '9800000002' })
  })

  it('reports a row with no phone or no pcode and skips blank rows', async () => {
    const { rows, errors } = await parseDoctorWorkbook(
      await sheetOf(['Pcode', 'Doctor Name', 'Phone'], [['', '', ''], ['P-1', 'Dr No Phone', ''], ['', 'Dr No Pcode', '9800000004'], ['P-3', 'Dr Ok', '9800000003']]),
    )
    expect(rows.map((r) => r.name)).toEqual(['Dr Ok'])
    expect(errors).toEqual(['Row 3: missing Phone.', 'Row 4: missing Pcode.'])
  })

  it('refuses a sheet with no phone column', async () => {
    const { rows, errors } = await parseDoctorWorkbook(await sheetOf(['Doctor Name'], [['Dr A']]))
    expect(rows).toEqual([])
    expect(errors[0]).toContain('"Phone"')
    expect(errors[0]).toContain('"Pcode"')
  })
})
