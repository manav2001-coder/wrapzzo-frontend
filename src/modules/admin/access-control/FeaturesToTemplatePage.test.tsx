import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, feature, template } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { FeaturesToTemplatePage } from './FeaturesToTemplatePage'

const currentUser = vi.hoisted(() => vi.fn())
const listFeatures = vi.hoisted(() => vi.fn())
const listTemplates = vi.hoisted(() => vi.fn())
const updateTemplate = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/features', () => ({ listFeatures, setFeatureActive: vi.fn() }))
vi.mock('@/api/templates', async (o) => ({ ...(await o<object>()), listTemplates, updateTemplate }))

async function openZoneAccess() {
  renderWithProviders(<FeaturesToTemplatePage />)
  await userEvent.click(screen.getByLabelText('Template'))
  await userEvent.click(await screen.findByText('Zone access'))
}

describe('FeaturesToTemplatePage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['template.view', 'template.edit']))
    listFeatures.mockReset().mockResolvedValue([
      feature('f-order', 'order', 'view', 'Orders'),
      feature('f-user', 'user', 'view', 'Users'),
      feature('f-off', 'warehouse', 'view', 'Warehouses', { active: false }),
      feature('f-platform', 'platform_company', 'view', 'Companies', { companyAssignable: false }),
    ])
    listTemplates.mockReset().mockResolvedValue([
      template({ accessControlIds: ['f-order'], effectiveAccessControlIds: ['f-order', 'f-user'], referencedTemplateIds: ['t-base'] }),
      template({ id: 't-sys', name: 'Member', system: true, companyId: null }),
    ])
    updateTemplate.mockReset().mockResolvedValue(template())
  })

  it('offers only active, company-holdable keys and shows what comes from included templates apart', async () => {
    await openZoneAccess()

    expect(await screen.findByLabelText('Orders: View')).toBeInTheDocument()
    expect(screen.queryByLabelText('Warehouses: View')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Companies: View')).not.toBeInTheDocument()
    expect(screen.getAllByText('Users: View')).toHaveLength(2) // on offer, and shown as inherited
  })

  it('saves the whole set when a key is added', async () => {
    await openZoneAccess()

    await userEvent.click(await screen.findByLabelText('Users: View'))
    await userEvent.click(screen.getByRole('button', { name: /^Add/ }))

    await waitFor(() =>
      expect(updateTemplate).toHaveBeenCalledWith('t-1', expect.objectContaining({ accessControlIds: ['f-order', 'f-user'], referencedTemplateIds: ['t-base'] })),
    )
  })

  it('is read-only on a system template for a company admin', async () => {
    renderWithProviders(<FeaturesToTemplatePage />)
    await userEvent.click(screen.getByLabelText('Template'))
    await userEvent.click(await screen.findByText('Member'))

    expect(await screen.findByText(/system template/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Add/ })).toBeDisabled()
  })
})
