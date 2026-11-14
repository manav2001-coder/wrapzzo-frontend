import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import FeaturesToTemplateAssignPage from './FeaturesToTemplateAssign'

const getResource = vi.hoisted(() => vi.fn())
const listResource = vi.hoisted(() => vi.fn())
const createResource = vi.hoisted(() => vi.fn())
const deactivateResource = vi.hoisted(() => vi.fn())
vi.mock('@/lib/masters-api', async (o) => ({ ...(await o<object>()), getResource, listResource, createResource, deactivateResource }))
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const feature = (key: string) => ({ id: key, key, moduleName: key.split('.')[0], actionName: key.split('.')[1] })

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/tbac/features-to-template/:templateId" element={<FeaturesToTemplateAssignPage />} />
    </Routes>,
    { route: '/tbac/features-to-template/t-1' },
  )
}

describe('FeaturesToTemplateAssignPage', () => {
  beforeEach(() => {
    getResource.mockReset().mockImplementation(async (path: string) =>
      path.endsWith('/effective-features')
        ? { direct: [feature('user.view')], inherited: [feature('order.view'), feature('order.create')] }
        : { id: 't-1', companyId: 'c-1', name: 'Area Manager', templateKey: 'c1_area_manager', description: null, icon: null, path: null, active: true, isSystem: false },
    )
    listResource.mockReset().mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 100, hasMore: false })
    createResource.mockReset().mockResolvedValue({ copied: 2, includesRemoved: 1 })
    deactivateResource.mockReset()
  })

  it('lets inherited features be made editable -- copied in as the template’s own, with a clear warning first', async () => {
    signedInWith(['features_to_template.view', 'features_to_template.assign', 'templates_to_template.assign'])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Make these editable' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('no longer follow later changes')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Make editable' }))

    await waitFor(() => expect(createResource).toHaveBeenCalledWith('/api/tbac/templates/t-1/make-editable', {}))
    // The screen reloads, so what was inherited can now be picked and removed.
    await waitFor(() => expect(getResource.mock.calls.filter(([path]) => String(path).endsWith('/effective-features')).length).toBeGreaterThan(1))
  })

  it('offers it only to someone who may both assign features and change includes', async () => {
    signedInWith(['features_to_template.view', 'features_to_template.assign'])
    renderPage()

    await screen.findByText('Area Manager')
    expect(screen.getByText(/Inherited \(2\)/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make these editable' })).not.toBeInTheDocument()
  })
})
