import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import type { Template } from '@/types/tbac'
import { renderWithProviders, screen } from '@/test/test-utils'
import TemplatesToTemplateAssignPage from './TemplatesToTemplateAssign'

const getResource = vi.hoisted(() => vi.fn())
const listAll = vi.hoisted(() => vi.fn())
vi.mock('@/lib/masters-api', async (o) => ({ ...(await o<object>()), getResource, listAll }))

const template = (over: Partial<Template>): Template => ({
  id: 't',
  companyId: 'c-1',
  name: 'T',
  templateKey: 'c1_t',
  description: null,
  icon: null,
  path: null,
  active: true,
  isSystem: false,
  ...over,
})

describe('TemplatesToTemplateAssignPage', () => {
  beforeEach(() => {
    getResource.mockReset().mockImplementation(async (path: string) =>
      path.endsWith('/references') ? { data: [] } : template({ id: 'area-manager', name: 'Area Manager' }),
    )
    listAll.mockReset().mockResolvedValue([template({ id: 'field-staff', name: 'Field Staff' }), template({ id: 'sys', name: 'Company Admin', companyId: null, isSystem: true })])
  })

  it('offers the template’s own company’s templates, not only system ones (platform staff have no company of their own)', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/tbac/templates-to-template/:templateId" element={<TemplatesToTemplateAssignPage />} />
      </Routes>,
      { route: '/tbac/templates-to-template/area-manager' },
    )

    await screen.findByText('Area Manager')
    expect(listAll).toHaveBeenCalledWith('/api/tbac/templates', { companyId: 'c-1' })
  })
})
