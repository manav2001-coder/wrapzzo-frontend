import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, role } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { RolesPage } from './RolesPage'

const currentUser = vi.hoisted(() => vi.fn())
const listRoles = vi.hoisted(() => vi.fn())
const createRole = vi.hoisted(() => vi.fn())
const deleteRole = vi.hoisted(() => vi.fn())
const bulkImportRoles = vi.hoisted(() => vi.fn())
const parseRoleWorkbook = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/roles', async (o) => ({ ...(await o<object>()), listRoles, createRole, deleteRole, bulkImportRoles }))
vi.mock('@/lib/roleTemplate', async (o) => ({ ...(await o<object>()), parseRoleWorkbook }))

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('RolesPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['role.view', 'role.edit']))
    listRoles.mockReset().mockResolvedValue([
      role({ id: 'r-admin', name: 'Company Admin', protectedRole: true, userCount: 3 }),
      role({ id: 'r-2', name: 'Zonal Head', userCount: 0 }),
    ])
    createRole.mockReset().mockResolvedValue(role({ id: 'r-3', name: 'Auditor' }))
    deleteRole.mockReset().mockResolvedValue(undefined)
    bulkImportRoles.mockReset().mockResolvedValue({ createdCount: 2, updatedCount: 0, roles: [] })
    parseRoleWorkbook.mockReset().mockResolvedValue({ rows: [{ name: 'MR' }, { name: 'ZBM', description: 'Zonal' }], errors: [] })
  })

  it('lists the company’s roles in a table with their users', async () => {
    renderWithProviders(<RolesPage />)

    expect(await screen.findByText('Zonal Head')).toBeInTheDocument()
    expect(within(rowOf('Company Admin')).getByText('Built-in')).toBeInTheDocument()
    expect(listRoles).toHaveBeenCalledWith('c-1')
  })

  it('creates a role from a name and description; what it can do is set under Templates to Role', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    await userEvent.click(screen.getByRole('button', { name: 'New role' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Auditor')
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }))

    await waitFor(() => expect(createRole).toHaveBeenCalledWith('c-1', { name: 'Auditor', description: undefined, active: true }))
  })

  it('offers removal only for roles that are not built in', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(within(rowOf('Company Admin')).queryByRole('button', { name: 'Remove Company Admin' })).not.toBeInTheDocument()
    await userEvent.click(within(rowOf('Zonal Head')).getByRole('button', { name: 'Remove Zonal Head' }))
    expect(deleteRole).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith('c-1', 'r-2'))
  })

  it('does not delete a role when the confirm is cancelled', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    await userEvent.click(within(rowOf('Zonal Head')).getByRole('button', { name: 'Remove Zonal Head' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(deleteRole).not.toHaveBeenCalled()
  })

  it('hides creating and removing without role.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['role.view']))
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Zonal Head' })).not.toBeInTheDocument()
  })

  it('imports the roles in a sheet', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    await userEvent.click(screen.getByRole('button', { name: 'Import' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.upload(dialog.querySelector('input[type="file"]') as HTMLInputElement, new File(['x'], 'roles.xlsx'))
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Import 2 roles' }))

    await waitFor(() => expect(bulkImportRoles).toHaveBeenCalledWith('c-1', [{ name: 'MR' }, { name: 'ZBM', description: 'Zonal' }]))
  })

  it('hides Import without role.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['role.view']))
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
  })
})
