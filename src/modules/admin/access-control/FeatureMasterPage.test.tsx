import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, feature } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { FeatureMasterPage } from './FeatureMasterPage'

const currentUser = vi.hoisted(() => vi.fn())
const listFeatures = vi.hoisted(() => vi.fn())
const setFeatureActive = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/features', () => ({ listFeatures, setFeatureActive }))

const platformStaff = (permissions: string[]) => ({
  data: { companyId: null, companyName: null, permissions, companyWide: true, managesTeam: false },
  isLoading: false,
})

describe('FeatureMasterPage', () => {
  beforeEach(() => {
    listFeatures.mockReset().mockResolvedValue([
      feature('f-1', 'order', 'view', 'Orders'),
      feature('f-2', 'platform_company', 'view', 'Companies', { companyAssignable: false, active: false }),
    ])
    setFeatureActive.mockReset().mockResolvedValue(feature('f-1', 'order', 'view', 'Orders', { active: false }))
  })

  it('lists keys by module and lets platform staff switch one off', async () => {
    currentUser.mockReturnValue(platformStaff(['template.view', 'template.edit']))
    renderWithProviders(<FeatureMasterPage />)

    expect(await screen.findByText('Platform only')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Switch Orders: View' }))

    await waitFor(() => expect(setFeatureActive).toHaveBeenCalledWith('f-1', false))
  })

  it('is read-only for a company admin', async () => {
    currentUser.mockReturnValue(companyAdmin(['template.view', 'template.edit']))
    renderWithProviders(<FeatureMasterPage />)

    expect(await screen.findByRole('switch', { name: 'Switch Orders: View' })).toBeDisabled()
  })

  it('narrows the list with the search box', async () => {
    currentUser.mockReturnValue(companyAdmin(['template.view']))
    renderWithProviders(<FeatureMasterPage />)
    await screen.findByText('Orders')

    await userEvent.type(screen.getByLabelText('Search features'), 'compan')

    expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    expect(screen.getByText('Companies')).toBeInTheDocument()
  })
})
