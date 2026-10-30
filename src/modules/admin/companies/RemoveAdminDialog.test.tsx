import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyUser } from '@/api/users'
import { role } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { RemoveAdminDialog } from './RemoveAdminDialog'

const listRoles = vi.hoisted(() => vi.fn())
const removeCompanyAdmin = vi.hoisted(() => vi.fn())
vi.mock('@/api/roles', async (o) => ({ ...(await o<object>()), listRoles }))
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), removeCompanyAdmin }))

const admin = { id: 'u-1', name: 'Priya', roleName: 'Company Admin' } as CompanyUser

describe('RemoveAdminDialog', () => {
  beforeEach(() => {
    listRoles.mockReset().mockResolvedValue([
      role({ id: 'r-admin', name: 'Company Admin', protectedRole: true }),
      role({ id: 'r-1', name: 'Zonal Head' }),
      role({ id: 'r-off', name: 'Retired', active: false }),
    ])
    removeCompanyAdmin.mockReset().mockResolvedValue(admin)
  })

  it('asks which role to move them to, offering neither Company Admin nor an inactive role', async () => {
    renderWithProviders(<RemoveAdminDialog companyId="c-1" user={admin} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Remove Company Admin' })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('Move to role'))
    expect(await screen.findByText('Zonal Head')).toBeInTheDocument()
    expect(screen.queryByText('Retired')).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Company Admin' })).not.toBeInTheDocument()
  })

  it('removes the admin into the chosen role', async () => {
    const onClose = vi.fn()
    renderWithProviders(<RemoveAdminDialog companyId="c-1" user={admin} onClose={onClose} />)

    await userEvent.click(screen.getByLabelText('Move to role'))
    await userEvent.click(await screen.findByText('Zonal Head'))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Company Admin' }))

    await waitFor(() => expect(removeCompanyAdmin).toHaveBeenCalledWith('c-1', 'u-1', 'r-1'))
    expect(onClose).toHaveBeenCalled()
  })
})
