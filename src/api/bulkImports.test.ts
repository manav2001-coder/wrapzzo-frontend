import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImportFailedError, type ImportJob } from './importJobs'
import { bulkCreateMyDoctors } from './recipients'
import { bulkImportUsers } from './users'

const post = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { post, get } }))
vi.mock('./importJobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./importJobs')>()
  return { ...actual, waitForImport: (job: ImportJob) => actual.waitForImport(job, { pollMs: 1 }) }
})

const job = (patch: Partial<ImportJob>): ImportJob => ({ id: 'job-1', kind: 'USERS', status: 'QUEUED', totalRows: 500, counts: {}, errors: [], message: null, ...patch })

describe('bulk uploads', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
  })

  it('a small users sheet answers at once with the counts', async () => {
    post.mockResolvedValue({ data: job({ id: null, status: 'COMPLETED', counts: { created: 3, updated: 1 } }) })

    await expect(bulkImportUsers('c-1', [])).resolves.toEqual({ createdCount: 3, updatedCount: 1 })
    expect(post).toHaveBeenCalledWith('/api/platform/companies/c-1/users/bulkImport', { rows: [] })
    expect(get).not.toHaveBeenCalled()
  })

  it('a big users sheet is followed until the server has saved it', async () => {
    post.mockResolvedValue({ data: job({ status: 'QUEUED' }) })
    get.mockResolvedValueOnce({ data: job({ status: 'RUNNING' }) }).mockResolvedValueOnce({ data: job({ status: 'COMPLETED', counts: { created: 480, updated: 20 } }) })

    await expect(bulkImportUsers('c-1', [])).resolves.toEqual({ createdCount: 480, updatedCount: 20 })
  })

  it('a users import that fails in the background rejects with the rows', async () => {
    post.mockResolvedValue({ data: job({ status: 'QUEUED' }) })
    get.mockResolvedValue({ data: job({ status: 'FAILED', message: 'Import validation failed. Nothing was imported.', errors: ['Row 4: unknown role'] }) })

    const error = await bulkImportUsers('c-1', []).catch((e) => e)

    expect(error).toBeInstanceOf(ImportFailedError)
    expect(error.details).toEqual(['Row 4: unknown role'])
  })

  it('a doctors sheet gives back what was created, joined and already there', async () => {
    post.mockResolvedValue({ data: job({ kind: 'DOCTORS', status: 'QUEUED' }) })
    get.mockResolvedValue({ data: job({ kind: 'DOCTORS', status: 'COMPLETED', counts: { created: 150, joined: 30, unchanged: 20 } }) })

    await expect(bulkCreateMyDoctors([])).resolves.toEqual({ created: 150, joined: 30, unchanged: 20 })
    expect(post).toHaveBeenCalledWith('/api/recipients/mine/bulk', { rows: [] })
  })
})
