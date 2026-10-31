import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Company } from '@/api/companies'
import { renderWithProviders, screen } from '@/test/test-utils'
import { newCoverageRow, VendorCoverageEditor, type CoverageRow } from './VendorCoverageEditor'

const listCompanyOrgUnits = vi.hoisted(() => vi.fn())
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), listCompanyOrgUnits }))

const companies = [
  { id: 'c-a', name: 'Alpha Pharma' },
  { id: 'c-b', name: 'Beta Pharma' },
] as Company[]

function Harness({ initial = [] as CoverageRow[], onChange = vi.fn() }) {
  const [rows, setRows] = useState(initial)
  return (
    <VendorCoverageEditor
      value={rows}
      companies={companies}
      onChange={(next) => {
        setRows(next)
        onChange(next)
      }}
    />
  )
}

describe('VendorCoverageEditor', () => {
  beforeEach(() => {
    listCompanyOrgUnits.mockReset().mockResolvedValue([
      { id: 'ou-n', name: 'North', levelName: 'Zone', parentId: null },
      { id: 'ou-s', name: 'South', levelName: 'Zone', parentId: null },
    ])
  })

  it('says so when the vendor serves no company yet, and adds a row', async () => {
    const onChange = vi.fn()
    renderWithProviders(<Harness onChange={onChange} />)

    expect(screen.getByText('Not serving any company yet.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add a company' }))

    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0][0]).toHaveLength(1)
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ companyId: null, whole: true, orgUnitIds: [] })
  })

  it('serves the whole company by default, and only asks for org units when limited', async () => {
    renderWithProviders(<Harness initial={[newCoverageRow('c-a')]} />)

    expect(screen.getByText('Whole company')).toBeInTheDocument()
    expect(screen.queryByLabelText('Org units')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Some org units' }))

    expect(await screen.findByLabelText('Org units')).toBeInTheDocument()
  })

  it('removes a company row', async () => {
    const onChange = vi.fn()
    renderWithProviders(<Harness initial={[newCoverageRow('c-a'), newCoverageRow('c-b')]} onChange={onChange} />)

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1)
    expect(onChange.mock.calls.at(-1)?.[0][0].companyId).toBe('c-b')
  })
})
