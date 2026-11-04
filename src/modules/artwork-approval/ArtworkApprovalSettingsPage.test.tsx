import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ArtworkApprovalSettings } from '@/api/artworkApproval'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ArtworkApprovalSettingsPage } from './ArtworkApprovalSettingsPage'

const getArtworkApprovalSettings = vi.hoisted(() => vi.fn())
const setArtworkApprovalSteps = vi.hoisted(() => vi.fn())
const useCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@/api/artworkApproval', async (importOriginal) => ({ ...(await importOriginal<object>()), getArtworkApprovalSettings, setArtworkApprovalSteps }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser, CURRENT_USER_QUERY_KEY: ['me'] }))

const ROLES = [
  { id: 'r-am', name: 'AM' },
  { id: 'r-rm', name: 'RM' },
  { id: 'r-ho', name: 'HO' },
]

function settings(overrides: Partial<ArtworkApprovalSettings> = {}): ArtworkApprovalSettings {
  return { enabled: true, levels: 1, steps: [], roles: ROLES, ...overrides }
}

function signedInWith(permissions: string[]) {
  useCurrentUser.mockReturnValue({ data: { companyId: 'c-1', companyName: 'Alembic', permissions }, isLoading: false })
}

async function choose(name: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('ArtworkApprovalSettingsPage', () => {
  beforeEach(() => {
    getArtworkApprovalSettings.mockReset().mockResolvedValue(settings())
    setArtworkApprovalSteps.mockReset()
    signedInWith(['artwork_approval.view', 'artwork_approval.configure'])
  })

  it('says what happens with no steps, and offers nothing to save until one is added', async () => {
    renderWithProviders(<ArtworkApprovalSettingsPage />)
    expect(await screen.findByText(/No steps set/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save steps' })).toBeDisabled()
  })

  it("builds RM then HO from the company's own roles and saves them in order", async () => {
    setArtworkApprovalSteps.mockResolvedValue(
      settings({
        steps: [
          { roleId: 'r-rm', roleName: 'RM', scope: 'REPORTING_LINE' },
          { roleId: 'r-ho', roleName: 'HO', scope: 'DIVISION' },
        ],
      }),
    )
    renderWithProviders(<ArtworkApprovalSettingsPage />)
    await screen.findByText(/No steps set/)

    await userEvent.click(screen.getByRole('button', { name: 'Add a step' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a step' }))
    expect(screen.getByRole('button', { name: 'Save steps' })).toBeDisabled() // roles not chosen yet

    await userEvent.click(screen.getByRole('combobox', { name: 'Role 1' }))
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual(['AM', 'RM', 'HO'])
    await userEvent.click(screen.getByRole('option', { name: 'RM' }))
    await choose('Role 2', 'HO')

    await userEvent.click(screen.getByRole('button', { name: 'Save steps' }))
    await waitFor(() =>
      expect(setArtworkApprovalSteps).toHaveBeenCalledWith([
        { roleId: 'r-rm', scope: 'REPORTING_LINE' },
        { roleId: 'r-ho', scope: 'DIVISION' },
      ]),
    )
  })

  it('shows saved steps, and removing them all goes back to the simple mode', async () => {
    getArtworkApprovalSettings.mockResolvedValue(settings({ steps: [{ roleId: 'r-rm', roleName: 'RM', scope: 'REPORTING_LINE' }] }))
    setArtworkApprovalSteps.mockResolvedValue(settings())
    renderWithProviders(<ArtworkApprovalSettingsPage />)
    expect(await screen.findByText('Step 1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove step 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save steps' }))
    await waitFor(() => expect(setArtworkApprovalSteps).toHaveBeenCalledWith([]))
  })

  it('explains, and does not let anyone edit, while Wrappzo has not switched the feature on', async () => {
    getArtworkApprovalSettings.mockResolvedValue(settings({ enabled: false }))
    renderWithProviders(<ArtworkApprovalSettingsPage />)
    expect(await screen.findByRole('status')).toHaveTextContent('not switched on for your company')
    expect(screen.queryByRole('button', { name: 'Add a step' })).not.toBeInTheDocument()
  })

  it('is read-only for someone who may only view it', async () => {
    signedInWith(['artwork_approval.view'])
    getArtworkApprovalSettings.mockResolvedValue(settings({ steps: [{ roleId: 'r-rm', roleName: 'RM', scope: 'REPORTING_LINE' }] }))
    renderWithProviders(<ArtworkApprovalSettingsPage />)
    expect(await screen.findByText('Step 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add a step' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save steps' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove step 1' })).not.toBeInTheDocument()
  })
})
