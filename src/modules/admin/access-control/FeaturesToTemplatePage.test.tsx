import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, feature, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { FeaturesToTemplateAssignPage } from './FeaturesToTemplateAssignPage'
import { FeaturesToTemplatePage } from './FeaturesToTemplatePage'

const currentUser = vi.hoisted(() => vi.fn())
const listCompanyFeatures = vi.hoisted(() => vi.fn())
const listFeatureCatalog = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
const updateTemplate = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/features', async (o) => ({ ...(await o<object>()), listCompanyFeatures, listFeatureCatalog }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates, updateTemplate }))

const assignAt = (id: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/access/features-to-template/:templateId" element={<FeaturesToTemplateAssignPage />} />
      <Route path="/access/features-to-template" element={<h1>List</h1>} />
    </Routes>,
    { route: `/access/features-to-template/${id}` },
  )

describe('Features to Template', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['template.view', 'template.edit']))
    const features = [
      feature('f-order', 'order', 'view', 'Orders'),
      feature('f-user', 'user', 'view', 'Users'),
      feature('f-off', 'warehouse', 'view', 'Warehouses', { active: false }),
      feature('f-gone', 'recipient', 'view', 'Recipients', { registered: false, active: false }),
    ]
    listCompanyFeatures.mockReset().mockResolvedValue(features)
    listFeatureCatalog.mockReset().mockResolvedValue(features.map((f) => ({ ...f, registered: true, active: true })))
    listTemplates.mockReset().mockResolvedValue([
      template({ accessControlIds: ['f-order'], effectiveAccessControlIds: ['f-order', 'f-user'], referencedTemplateIds: ['t-base'] }),
      template({ id: 't-sys', name: 'Company Admin', system: true, companyId: null }),
    ])
    updateTemplate.mockReset().mockResolvedValue(template())
  })

  it('lists the templates in scope with how much each holds', async () => {
    renderWithProviders(<FeaturesToTemplatePage />)

    const row = (await screen.findByText('Zone access')).closest('tr') as HTMLElement
    expect(within(row).getByRole('button', { name: 'Assign for Zone access' })).toBeInTheDocument()
    expect(listTemplates).toHaveBeenCalledWith('c-1')
  })

  it('offers only the features the company has registered and on, and shows inherited ones apart', async () => {
    assignAt('t-1')

    expect(await screen.findByLabelText('Users: View')).toBeInTheDocument()
    expect(screen.queryByLabelText('Warehouses: View')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Recipients: View')).not.toBeInTheDocument()
    expect(screen.getAllByText('Users: View')).toHaveLength(2) // on offer, and shown as inherited
  })

  it('saves the whole set when a feature is added', async () => {
    assignAt('t-1')

    await userEvent.click(await screen.findByLabelText('Users: View'))
    await userEvent.click(screen.getByRole('button', { name: /^Add/ }))

    await waitFor(() =>
      expect(updateTemplate).toHaveBeenCalledWith('t-1', expect.objectContaining({ accessControlIds: ['f-order', 'f-user'], referencedTemplateIds: ['t-base'] })),
    )
  })

  it('is read-only on a system template for a company admin', async () => {
    assignAt('t-sys')

    expect(await screen.findByText(/system template/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Add/ })).toBeDisabled()
  })
})
