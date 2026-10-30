import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Role } from '@/api/roles'
import type { AccessTemplate } from '@/api/templates'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { RolesPage } from './RolesPage'

const currentUser = vi.hoisted(() => vi.fn())
const listRoles = vi.hoisted(() => vi.fn())
const createRole = vi.hoisted(() => vi.fn())
const deleteRole = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/roles', async (o) => ({ ...(await o<object>()), listRoles, createRole, deleteRole }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates }))

const signedInWith = (permissions: string[]) =>
  currentUser.mockReturnValue({
    data: { companyId: 'c-1', companyName: 'Alembic', permissions, companyWide: true, managesTeam: false },
    isLoading: false,
  })

const role = (over: Partial<Role>): Role => ({
  id: 'r-1',
  name: 'Member',
  description: null,
  active: true,
  protectedRole: true,
  userCount: 3,
  templateIds: ['t-member'],
  ...over,
})

const template = (over: Partial<AccessTemplate>): AccessTemplate => ({
  id: 't-member',
  companyId: null,
  name: 'Member',
  description: null,
  active: true,
  system: true,
  accessControlIds: [],
  referencedTemplateIds: [],
  effectiveAccessControlIds: [],
  roleCount: 1,
  userCount: 0,
  ...over,
})

describe('RolesPage', () => {
  beforeEach(() => {
    signedInWith(['role.view', 'role.edit', 'template.view'])
    listRoles.mockReset().mockResolvedValue([role({}), role({ id: 'r-2', name: 'Zonal Head', protectedRole: false, userCount: 0, templateIds: [] })])
    listTemplates.mockReset().mockResolvedValue([template({}), template({ id: 't-zone', name: 'Zone access', system: false, companyId: 'c-1' })])
    createRole.mockReset().mockResolvedValue(role({ id: 'r-3', name: 'Auditor', protectedRole: false }))
    deleteRole.mockReset().mockResolvedValue(undefined)
  })

  it('lists the company’s roles with their users and mapped templates', async () => {
    renderWithProviders(<RolesPage />)

    expect(await screen.findByText('Zonal Head')).toBeInTheDocument()
    expect(screen.getByText('3 users')).toBeInTheDocument()
    expect(screen.getByText('Built-in')).toBeInTheDocument()
    expect(screen.getByText('No templates mapped: this role grants nothing yet.')).toBeInTheDocument()
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

  it('offers removal only for roles that are not built in, and only with role.edit', async () => {
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(screen.getByRole('button', { name: 'Remove Zonal Head' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Member' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Zonal Head' }))
    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith('c-1', 'r-2'))
  })

  it('hides creating and removing without role.edit', async () => {
    signedInWith(['role.view'])
    renderWithProviders(<RolesPage />)
    await screen.findByText('Zonal Head')

    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Zonal Head' })).not.toBeInTheDocument()
  })
})
