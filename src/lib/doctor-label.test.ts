import { describe, expect, it } from 'vitest'

import { doctorLabel } from './doctor-label'

describe('doctorLabel', () => {
  it('puts the pcode in brackets after the name', () => {
    expect(doctorLabel('Dr. Asha Shah', 'P-1001')).toBe('Dr. Asha Shah (P-1001)')
    expect(doctorLabel('  Dr. Asha Shah ', ' P-1001 ')).toBe('Dr. Asha Shah (P-1001)')
  })

  it('shows no empty brackets when there is no pcode', () => {
    expect(doctorLabel('Dr. Asha Shah', null)).toBe('Dr. Asha Shah')
    expect(doctorLabel('Dr. Asha Shah', '  ')).toBe('Dr. Asha Shah')
  })

  it('shows just the pcode when the name is missing, and nothing when both are', () => {
    expect(doctorLabel(null, 'P-1001')).toBe('(P-1001)')
    expect(doctorLabel(undefined, undefined)).toBe('')
  })
})
