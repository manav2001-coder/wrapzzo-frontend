import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { ImportFailedError, importErrorDetails, waitForImport, type ImportJob } from './importJobs'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/axiosClient', async (importOriginal) => ({ ...(await importOriginal<object>()), apiClient: { get } }))

const job = (patch: Partial<ImportJob> = {}): ImportJob => ({
  id: 'job-1',
  kind: 'USERS',
  status: 'QUEUED',
  totalRows: 500,
  counts: {},
  errors: [],
  message: null,
  ...patch,
})

describe('waitForImport', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('returns at once for a small sheet the server already finished', async () => {
    const done = job({ id: null, status: 'COMPLETED', counts: { created: 3, updated: 0 } })
    await expect(waitForImport(done)).resolves.toBe(done)
    expect(get).not.toHaveBeenCalled()
  })

  it('asks again until a queued import completes', async () => {
    get
      .mockResolvedValueOnce({ data: job({ status: 'RUNNING' }) })
      .mockResolvedValueOnce({ data: job({ status: 'COMPLETED', counts: { created: 500, updated: 0 } }) })

    const done = await waitForImport(job(), { pollMs: 1 })

    expect(done.counts).toEqual({ created: 500, updated: 0 })
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenCalledWith('/api/import-jobs/job-1')
  })

  it('rejects with the bad rows when the import failed', async () => {
    get.mockResolvedValueOnce({ data: job({ status: 'FAILED', message: 'Import validation failed. Nothing was imported.', errors: ['Row 3: unknown role'] }) })

    const error = await waitForImport(job(), { pollMs: 1 }).catch((e) => e)

    expect(error).toBeInstanceOf(ImportFailedError)
    expect(error.message).toContain('Nothing was imported')
    expect(error.details).toEqual(['Row 3: unknown role'])
  })

  it('carries on through a few failed checks, because the import itself keeps running', async () => {
    get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: job({ status: 'COMPLETED', counts: { created: 1 } }) })

    await expect(waitForImport(job(), { pollMs: 1 })).resolves.toMatchObject({ status: 'COMPLETED' })
  })

  it('gives up after five checks in a row fail', async () => {
    get.mockRejectedValue(new Error('Network Error'))

    await expect(waitForImport(job(), { pollMs: 1 })).rejects.toThrow('Network Error')
    expect(get).toHaveBeenCalledTimes(5)
  })

  it('tells the person it is still running on the server when it takes too long', async () => {
    get.mockResolvedValue({ data: job({ status: 'RUNNING' }) })

    await expect(waitForImport(job(), { pollMs: 1, timeoutMs: 20 })).rejects.toThrow(/keeps running on the server/)
  })
})

describe('importErrorDetails', () => {
  it('reads the bad rows from a refused upload and from a failed background import', () => {
    expect(importErrorDetails(new ApiError('Import validation failed', 400, { details: ['Row 2: bad email'] }))).toEqual(['Row 2: bad email'])
    expect(importErrorDetails(new ImportFailedError('failed', ['Row 9: bad role']))).toEqual(['Row 9: bad role'])
  })

  it('has none for any other error', () => {
    expect(importErrorDetails(new ApiError('Not allowed', 403))).toBeUndefined()
    expect(importErrorDetails(new ImportFailedError('The server stopped', []))).toBeUndefined()
    expect(importErrorDetails(new Error('boom'))).toBeUndefined()
  })
})
