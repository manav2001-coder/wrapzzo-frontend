import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { JobRun } from '@/api/jobs'
import { P } from '@/lib/permissions'
import { platformStaff } from '@/test/tbac-fixtures'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'
import { JobsMonitorPage } from './JobsMonitorPage'

const currentUser = vi.hoisted(() => vi.fn())
const retryJobRun = vi.hoisted(() => vi.fn())
const removeJobRun = vi.hoisted(() => vi.fn())
const rows = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/hooks/use-current-user', async (o) => ({ ...(await o<object>()), useCurrentUser: currentUser }))
vi.mock('@/api/jobs', async (o) => ({ ...(await o<object>()), retryJobRun, removeJobRun }))
vi.mock('@/lib/masters-api', async (o) => ({
  ...(await o<object>()),
  tableFetcher: () => async () => ({ rows: rows.current, pageCount: 1, totalCount: rows.current.length }),
}))

const run = (over: Partial<JobRun>): JobRun => ({
  id: 'r-1',
  jobName: 'refresh-token-cleanup',
  label: 'Refresh token cleanup',
  status: 'COMPLETED',
  triggeredBy: 'Schedule',
  attempts: 1,
  startedAt: '2026-10-31T03:00:00Z',
  finishedAt: '2026-10-31T03:00:01Z',
  result: 'Purged 12 expired or revoked refresh tokens',
  error: null,
  ...over,
})

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('JobsMonitorPage', () => {
  beforeEach(() => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_JOBS_VIEW, P.PLATFORM_JOBS_MANAGE]))
    retryJobRun.mockReset().mockResolvedValue(run({ status: 'COMPLETED', attempts: 2 }))
    removeJobRun.mockReset().mockResolvedValue(undefined)
    rows.current = [
      run({ id: 'ok', label: 'Refresh token cleanup' }),
      run({ id: 'bad', label: 'Recurring orders', status: 'FAILED', result: null, error: 'database is down' }),
    ]
  })

  it('lists every run with how it ended', async () => {
    renderWithProviders(<JobsMonitorPage />)

    expect(await screen.findByText('Recurring orders')).toBeInTheDocument()
    expect(within(rowOf('Refresh token cleanup')).getByText('Completed')).toBeInTheDocument()
    expect(within(rowOf('Recurring orders')).getByText('Failed')).toBeInTheDocument()
  })

  it('offers retry on a failed run only, and runs it again', async () => {
    renderWithProviders(<JobsMonitorPage />)
    await screen.findByText('Recurring orders')

    expect(within(rowOf('Refresh token cleanup')).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    await userEvent.click(within(rowOf('Recurring orders')).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(retryJobRun).toHaveBeenCalledWith('bad'))
  })

  it('asks before removing a run', async () => {
    renderWithProviders(<JobsMonitorPage />)
    await screen.findByText('Recurring orders')

    await userEvent.click(within(rowOf('Recurring orders')).getByRole('button', { name: 'Remove' }))
    expect(removeJobRun).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeJobRun).toHaveBeenCalledWith('bad'))
  })

  it('shows the runs read-only without the manage key', async () => {
    currentUser.mockReturnValue(platformStaff([P.PLATFORM_JOBS_VIEW]))
    renderWithProviders(<JobsMonitorPage />)
    await screen.findByText('Recurring orders')

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })
})
