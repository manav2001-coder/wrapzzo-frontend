import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AccessControlItem } from '@/api/accessControls'
import type { AccessTemplate } from '@/api/templates'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { TemplatesPage } from './TemplatesPage'

const currentUser = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
const createTemplate = vi.hoisted(() => vi.fn())
const cloneTemplate = vi.hoisted(() => vi.fn())
const listAccessControlCatalog = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates, createTemplate, cloneTemplate }))
vi.mock('@/api/accessControls', async (o) => ({ ...(await o<object>()), listAccessControlCatalog }))

const signedInWith = (permissions: string[]) =>
  currentUser.mockReturnValue({
    data: { companyId: 'c-1', companyName: 'Alembic', permissions, companyWide: true, managesTeam: false },
    isLoading: false,
  })

const item = (id: string, module: string, action: string, category: string, sortOrder: number): AccessControlItem => ({
  id,
  key: `${module}.${action}`,
  module,
  action,
  name: action[0].toUpperCase() + action.slice(1),
  description: null,
  category,
  type: 'FUNCTIONAL',
  sortOrder,
})

const template = (over: Partial<AccessTemplate>): AccessTemplate => ({
  id: 't-1',
  companyId: null,
  name: 'Member',
  description: null,
  active: true,
  system: true,
  accessControlIds: ['ac-order-view'],
  referencedTemplateIds: [],
  effectiveAccessControlIds: ['ac-order-view'],
  roleCount: 2,
  userCount: 0,
  ...over,
})

describe('TemplatesPage', () => {
  beforeEach(() => {
    signedInWith(['template.view', 'template.edit'])
    listAccessControlCatalog.mockReset().mockResolvedValue([
      item('ac-order-view', 'order', 'view', 'Orders', 600),
      item('ac-user-view', 'user', 'view', 'Users', 900),
      item('ac-user-edit', 'user', 'edit', 'Users', 902),
    ])
    listTemplates.mockReset().mockResolvedValue([template({}), template({ id: 't-own', companyId: 'c-1', name: 'Zone access', system: false, roleCount: 0 })])
    createTemplate.mockReset().mockResolvedValue(template({ id: 't-new' }))
    cloneTemplate.mockReset().mockResolvedValue(template({ id: 't-copy', name: 'Member (copy)', system: false }))
  })

  it('shows system masters and the company’s own, and lets a company clone but not edit a system one', async () => {
    renderWithProviders(<TemplatesPage />)

    expect(await screen.findByText('Zone access')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Member' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Zone access' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clone Member' }))
    await waitFor(() => expect(cloneTemplate).toHaveBeenCalledWith('c-1', 't-1', 'Member (copy)'))
  })

  it('creates a template; ticking an action also grants its module’s View', async () => {
    renderWithProviders(<TemplatesPage />)
    await screen.findByText('Zone access')

    await userEvent.click(screen.getByRole('button', { name: 'New template' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'People managers')
    await userEvent.click(screen.getByLabelText('Users: Edit'))
    await userEvent.click(screen.getByLabelText('Zone access'))
    await userEvent.click(screen.getByRole('button', { name: 'Save template' }))

    await waitFor(() => expect(createTemplate).toHaveBeenCalled())
    const [companyId, input] = createTemplate.mock.calls[0]
    expect(companyId).toBe('c-1')
    expect(input).toMatchObject({ name: 'People managers', active: true, referencedTemplateIds: ['t-own'] })
    expect(input.accessControlIds).toEqual(expect.arrayContaining(['ac-user-edit', 'ac-user-view']))
    expect(input.accessControlIds).toHaveLength(2)
  })

  it('hides create, clone and edit without template.edit', async () => {
    signedInWith(['template.view'])
    renderWithProviders(<TemplatesPage />)
    await screen.findByText('Zone access')

    expect(screen.queryByRole('button', { name: 'New template' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clone Member' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Zone access' })).not.toBeInTheDocument()
  })
})
