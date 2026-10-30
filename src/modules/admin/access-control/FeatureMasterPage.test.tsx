import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { companyAdmin, feature, platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { FeatureMasterPage } from './FeatureMasterPage'

const currentUser = vi.hoisted(() => vi.fn())
const listCompanyFeatures = vi.hoisted(() => vi.fn())
const registerFeatures = vi.hoisted(() => vi.fn())
const setFeatureActive = vi.hoisted(() => vi.fn())
const listCompanies = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/features', async (o) => ({ ...(await o<object>()), listCompanyFeatures, registerFeatures, setFeatureActive }))
vi.mock('@/api/companies', async (o) => ({ ...(await o<object>()), listCompanies }))

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('FeatureMasterPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(companyAdmin(['template.view', 'template.edit']))
    listCompanyFeatures.mockReset().mockResolvedValue([
      feature('f-order', 'order', 'view', 'Orders'),
      feature('f-user', 'user', 'view', 'Users', { active: false }),
      feature('f-wh', 'warehouse', 'view', 'Warehouses', { registered: false, active: false }),
    ])
    registerFeatures.mockReset().mockResolvedValue([])
    setFeatureActive.mockReset().mockResolvedValue(feature('f-order', 'order', 'view', 'Orders', { active: false }))
    listCompanies.mockReset().mockResolvedValue([
      { id: 'c-a', name: 'Alpha Pharma' },
      { id: 'c-b', name: 'Beta Pharma' },
    ])
  })

  it('lists the company’s features with their status', async () => {
    renderWithProviders(<FeatureMasterPage />)

    expect(await screen.findByText('Orders')).toBeInTheDocument()
    expect(within(rowOf('Orders')).getByText('Active')).toBeInTheDocument()
    expect(within(rowOf('Users')).getByText('Inactive')).toBeInTheDocument()
    expect(within(rowOf('Warehouses')).getByText('Not added')).toBeInTheDocument()
    expect(listCompanyFeatures).toHaveBeenCalledWith('c-1')
  })

  it('registers one missing feature, or every missing one at once', async () => {
    renderWithProviders(<FeatureMasterPage />)
    await screen.findByText('Warehouses')

    await userEvent.click(within(rowOf('Warehouses')).getByRole('button', { name: 'Add Warehouses: View' }))
    await waitFor(() => expect(registerFeatures).toHaveBeenCalledWith('c-1', ['f-wh']))

    await userEvent.click(screen.getByRole('button', { name: 'Add all missing (1)' }))
    await waitFor(() => expect(registerFeatures).toHaveBeenLastCalledWith('c-1', undefined))
  })

  it('switches a registered feature off for the company', async () => {
    renderWithProviders(<FeatureMasterPage />)
    await screen.findByText('Orders')

    await userEvent.click(screen.getByRole('switch', { name: 'Switch Orders: View' }))

    await waitFor(() => expect(setFeatureActive).toHaveBeenCalledWith('c-1', 'f-order', false))
  })

  it('is read-only without template.edit', async () => {
    currentUser.mockReturnValue(companyAdmin(['template.view']))
    renderWithProviders(<FeatureMasterPage />)
    await screen.findByText('Orders')

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add all missing/ })).not.toBeInTheDocument()
  })

  it('opens platform staff on the first company, and on the one named in the URL', async () => {
    currentUser.mockReturnValue(platformStaff(['template.view', 'template.edit']))
    renderWithProviders(<FeatureMasterPage />)
    await waitFor(() => expect(listCompanyFeatures).toHaveBeenCalledWith('c-a'))
  })

  it('honours ?company= for platform staff', async () => {
    currentUser.mockReturnValue(platformStaff(['template.view']))
    renderWithProviders(<FeatureMasterPage />, { route: '/access/features?company=c-b' })
    await waitFor(() => expect(listCompanyFeatures).toHaveBeenCalledWith('c-b'))
    expect(listCompanyFeatures).not.toHaveBeenCalledWith('c-a')
  })
})
