import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, role, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { RolesPage } from './RolesPage'

const currentUser = vi.hoisted(() => vi.fn())
const listRoles = vi.hoisted(() => vi.fn())
const createRole = vi.hoisted(() => vi.fn())
const deleteRole = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/roles', async (o) => ({ ...(await o<object>()), listRoles, createRole, deleteRole }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates }))

const rowOf = (name: string) => screen.getAllByText(name)[0].closest('tr') as HTMLElement

describe('RolesPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['role.view', 'role.edit', 'template.view']))
    listRoles.mockReset().mockResolvedValue([
      role({ id: 'r-admin', name: 'Company Admin', protectedRole: true, userCount: 3, templateIds: ['t-sys'] }),
      role({ id: 'r-2', name: 'Zonal Head', userCount: 0, templateIds: [] }),
    ])
    listTemplates.mockReset().mockResolvedValue([
      template({ id: 't-sys', companyId: null, system: true, name: 'Company Admin' }),
      template({ id: 't-zone', name: 'Zone access' }),
    ])
    createRole.mockReset().mockResolvedValue(role({ id: 'r-3', name: 'Auditor' }))
    deleteRole.mockReset().mockResolvedValue(undefined)
  })

  it('lists the company’s roles in a table with their users and templates', async () => {
    renderWithProviders(<RolesPage />)

    expect(await screen.findByText('Zonal Head')).toBeInTheDocument()
    expect(within(rowOf('Zonal Head')).getByText('No templates mapped: this role grants nothing yet.')).toBeInTheDocument()
    expect(within(rowOf('Company Admin')).getByText('Built-in')).toBeInTheDocument()
    expect(listRoles).toHaveBeenCalledWith('c-1')
  })

  it('creates a role with the templates ticked', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    await userEvent.click(screen.getByRole('button', { name: 'New role' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Auditor')
    await userEvent.click(screen.getByLabelText('Zone access'))
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }))

    await waitFor(() =>
      expect(createRole).toHaveBeenCalledWith('c-1', { name: 'Auditor', description: undefined, active: true, templateIds: ['t-zone'] }),
    )
  })

  it('offers removal only for roles that are not built in', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(within(rowOf('Company Admin')).queryByRole('button', { name: 'Remove Company Admin' })).not.toBeInTheDocument()
    await userEvent.click(within(rowOf('Zonal Head')).getByRole('button', { name: 'Remove Zonal Head' }))
    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith('c-1', 'r-2'))
  })

  it('hides creating and removing without role.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['role.view']))
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Zonal Head' })).not.toBeInTheDocument()
  })
})
