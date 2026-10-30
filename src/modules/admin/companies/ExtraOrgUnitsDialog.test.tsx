import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyUser } from '@/api/users'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ExtraOrgUnitsDialog } from './ExtraOrgUnitsDialog'

const listCompanyOrgUnits = vi.hoisted(() => vi.fn())
const setExtraOrgUnits = vi.hoisted(() => vi.fn())
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), listCompanyOrgUnits, setExtraOrgUnits }))

const MANAGER: CompanyUser = {
  id: 'u-1',
  name: 'Priya',
  email: 'priya@alembic.in',
  mobile: null,
  designation: 'Zonal Manager',
  employeeCode: null,
  status: 'ACTIVE',
  reportsToName: null,
  orgUnitId: 'north',
  orgUnitName: 'North',
  companyWide: false,
  extraOrgUnits: [{ id: 'east', name: 'East' }],
  roleId: 'r-1',
  roleName: 'Member',
  createdAt: '2026-10-01T00:00:00Z',
}

describe('ExtraOrgUnitsDialog', () => {
  beforeEach(() => {
    listCompanyOrgUnits.mockReset().mockResolvedValue([
      { id: 'division', name: 'Division', levelName: 'Division', parentId: null },
      { id: 'north', name: 'North', levelName: 'Zone', parentId: 'division' },
      { id: 'south', name: 'South', levelName: 'Zone', parentId: 'division' },
      { id: 'east', name: 'East', levelName: 'Zone', parentId: 'division' },
    ])
    setExtraOrgUnits.mockReset().mockResolvedValue(MANAGER)
  })

  it('lists every unit but the user’s own, starts from what they already cover, and saves the full set', async () => {
    const onClose = vi.fn()
    renderWithProviders(<ExtraOrgUnitsDialog companyId="c-1" user={MANAGER} onClose={onClose} />)

    expect(await screen.findByLabelText('South')).not.toBeChecked()
    expect(screen.getByLabelText('East')).toBeChecked()
    expect(screen.queryByLabelText('North')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('South'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(setExtraOrgUnits).toHaveBeenCalledWith('c-1', 'u-1', expect.arrayContaining(['east', 'south'])))
    expect(setExtraOrgUnits.mock.calls[0][2]).toHaveLength(2)
    expect(onClose).toHaveBeenCalled()
  })
})
