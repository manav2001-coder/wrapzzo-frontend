import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { UserToTemplatePage } from './UserToTemplatePage'

const currentUser = vi.hoisted(() => vi.fn())
const listCompanyUsers = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
const getUserTemplates = vi.hoisted(() => vi.fn())
const replaceUserTemplates = vi.hoisted(() => vi.fn())
const bulkAssignUserTemplates = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/users', async (o) => ({ ...(await o<object>()), listCompanyUsers }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates, getUserTemplates, replaceUserTemplates, bulkAssignUserTemplates }))

const user = (id: string, name: string) => ({ id, name, email: `${id}@x.in`, roleName: 'Member' })

describe('UserToTemplatePage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['access.view', 'access.edit', 'template.view']))
    listCompanyUsers.mockReset().mockResolvedValue([user('u-1', 'Asha'), user('u-2', 'Ravi')])
    listTemplates.mockReset().mockResolvedValue([template({ id: 't-1', name: 'Zone access' }), template({ id: 't-2', name: 'Orders access' })])
    getUserTemplates.mockReset().mockResolvedValue(['t-1'])
    replaceUserTemplates.mockReset().mockResolvedValue(['t-1', 't-2'])
    bulkAssignUserTemplates.mockReset().mockResolvedValue([
      { userId: 'u-1', userName: 'Asha', added: 1, skipped: 0, status: 'ok', error: null },
      { userId: 'u-2', userName: 'Ravi', added: 0, skipped: 1, status: 'failed', error: 'User not found in this company' },
    ])
  })

  it('edits one user’s templates by moving them across', async () => {
    renderWithProviders(<UserToTemplatePage />)

    await userEvent.click(await screen.findByLabelText('Asha'))
    await userEvent.click(await screen.findByLabelText('Orders access'))
    await userEvent.click(screen.getByRole('button', { name: /^Add/ }))

    await waitFor(() => expect(replaceUserTemplates).toHaveBeenCalledWith('c-1', 'u-1', ['t-1', 't-2']))
  })

  it('gives several users the same templates and reports each one', async () => {
    renderWithProviders(<UserToTemplatePage />)

    await userEvent.click(await screen.findByLabelText('Asha'))
    await userEvent.click(screen.getByLabelText('Ravi'))
    await userEvent.click(await screen.findByLabelText('Orders access'))
    await userEvent.click(screen.getByRole('button', { name: 'Assign to 2 users' }))

    await waitFor(() => expect(bulkAssignUserTemplates).toHaveBeenCalledWith('c-1', expect.arrayContaining(['u-1', 'u-2']), ['t-2']))
    expect(await screen.findByText(/1 added, 0 already had/)).toBeInTheDocument()
    expect(screen.getByText(/User not found in this company/)).toBeInTheDocument()
  })

  it('cannot assign without access.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['access.view', 'template.view']))
    renderWithProviders(<UserToTemplatePage />)

    await userEvent.click(await screen.findByLabelText('Asha'))

    expect(await screen.findByLabelText('Orders access')).toBeDisabled()
  })
})
