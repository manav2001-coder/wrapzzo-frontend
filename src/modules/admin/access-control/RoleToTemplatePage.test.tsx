import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, role, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { RoleToTemplateAssignPage } from './RoleToTemplateAssignPage'
import { RoleToTemplatePage } from './RoleToTemplatePage'

const currentUser = vi.hoisted(() => vi.fn())
const listRoles = vi.hoisted(() => vi.fn())
const replaceRoleTemplates = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/roles', async (o) => ({ ...(await o<object>()), listRoles, replaceRoleTemplates }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates }))

const assign = () =>
  renderWithProviders(
    <Routes>
      <Route path="/access/role-templates/:roleId" element={<RoleToTemplateAssignPage />} />
    </Routes>,
    { route: '/access/role-templates/r-1' },
  )

describe('Role to Template', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['role.view', 'role.edit', 'template.view']))
    listRoles.mockReset().mockResolvedValue([role({ templateIds: ['t-1'] })])
    listTemplates.mockReset().mockResolvedValue([template({ id: 't-1', name: 'Zone access' }), template({ id: 't-2', name: 'Orders access' })])
    replaceRoleTemplates.mockReset().mockResolvedValue({})
  })

  it('lists the roles with how many templates each carries', async () => {
    renderWithProviders(<RoleToTemplatePage />)

    const row = (await screen.findByText('Zonal Head')).closest('tr') as HTMLElement
    expect(within(row).getByRole('button', { name: 'Assign for Zonal Head' })).toBeInTheDocument()
  })

  it('shows the role’s templates apart from the ones it could take, and saves the new set on add', async () => {
    assign()

    await userEvent.click(await screen.findByLabelText('Orders access'))
    await userEvent.click(screen.getByRole('button', { name: /^Add/ }))

    await waitFor(() => expect(replaceRoleTemplates).toHaveBeenCalledWith('c-1', 'r-1', ['t-1', 't-2']))
  })

  it('saves without a template when it is removed', async () => {
    assign()

    await userEvent.click(await screen.findByLabelText('Zone access'))
    await userEvent.click(screen.getByRole('button', { name: /^Remove/ }))

    await waitFor(() => expect(replaceRoleTemplates).toHaveBeenCalledWith('c-1', 'r-1', []))
  })

  it('cannot change anything without role.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['role.view', 'template.view']))
    assign()

    expect(await screen.findByLabelText('Orders access')).toBeDisabled()
  })
})
