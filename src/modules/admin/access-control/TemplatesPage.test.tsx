import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, feature, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { TemplatesPage } from './TemplatesPage'

const currentUser = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
const createTemplate = vi.hoisted(() => vi.fn())
const cloneTemplate = vi.hoisted(() => vi.fn())
const listCompanyFeatures = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates, createTemplate, cloneTemplate }))
vi.mock('@/api/features', async (o) => ({ ...(await o<object>()), listCompanyFeatures }))

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('TemplatesPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['template.view', 'template.edit']))
    listCompanyFeatures.mockReset().mockResolvedValue([
      feature('ac-order-view', 'order', 'view', 'Orders'),
      feature('ac-user-view', 'user', 'view', 'Users'),
      feature('ac-user-edit', 'user', 'edit', 'Users'),
      feature('ac-off', 'warehouse', 'view', 'Warehouses', { active: false }),
    ])
    listTemplates.mockReset().mockResolvedValue([
      template({ id: 't-sys', companyId: null, name: 'Company Admin', system: true, accessControlIds: ['ac-order-view'], effectiveAccessControlIds: ['ac-order-view'] }),
      template({ id: 't-own', name: 'Zone access' }),
    ])
    createTemplate.mockReset().mockResolvedValue(template({ id: 't-new' }))
    cloneTemplate.mockReset().mockResolvedValue(template({ id: 't-copy', name: 'Company Admin (copy)' }))
  })

  it('lists the system masters and the company’s own in a table, with their scope', async () => {
    renderWithProviders(<TemplatesPage />)

    expect(await screen.findByText('Zone access')).toBeInTheDocument()
    expect(within(rowOf('Company Admin')).getByText('System')).toBeInTheDocument()
    expect(within(rowOf('Zone access')).getByText('Company')).toBeInTheDocument()
    expect(listTemplates).toHaveBeenCalledWith('c-1')
  })

  it('lets a company clone a system master but not edit it', async () => {
    renderWithProviders(<TemplatesPage />)
    await screen.findByText('Zone access')

    await userEvent.click(within(rowOf('Company Admin')).getByRole('button', { name: 'Clone Company Admin' }))

    await waitFor(() => expect(cloneTemplate).toHaveBeenCalledWith('c-1', 't-sys', 'Company Admin (copy)'))
    expect(within(rowOf('Company Admin')).queryByRole('button', { name: 'Remove Company Admin' })).not.toBeInTheDocument()
  })

  it('creates a template from the company’s enabled features only; an action brings its View', async () => {
    renderWithProviders(<TemplatesPage />)
    await screen.findByText('Zone access')

    await userEvent.click(screen.getByRole('button', { name: 'New template' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'People managers')
    expect(screen.queryByLabelText('Warehouses: View')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Users: Edit'))
    await userEvent.click(screen.getByRole('button', { name: 'Save template' }))

    await waitFor(() => expect(createTemplate).toHaveBeenCalled())
    const [companyId, input] = createTemplate.mock.calls[0]
    expect(companyId).toBe('c-1')
    expect(input).toMatchObject({ name: 'People managers', active: true, referencedTemplateIds: [] })
    expect([...input.accessControlIds].sort()).toEqual(['ac-user-edit', 'ac-user-view'])
  })

  it('hides create and clone without template.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['template.view']))
    renderWithProviders(<TemplatesPage />)
    await screen.findByText('Zone access')

    expect(screen.queryByRole('button', { name: 'New template' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clone Company Admin' })).not.toBeInTheDocument()
  })
})
