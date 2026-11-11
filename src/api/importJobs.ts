import { ApiError, apiClient } from '@/lib/axiosClient'

export type ImportJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

/** Where a bulk upload stands. A small sheet comes back COMPLETED at once; a large one is saved in the background. */
export interface ImportJob {
  id: string | null
  kind: 'USERS' | 'DOCTORS'
  status: ImportJobStatus
  totalRows: number
  counts: Record<string, number>
  errors: string[]
  message: string | null
}

/** The server saved nothing: the import failed. `details` names the bad rows, when it has them. */
export class ImportFailedError extends Error {
  details: string[]

  constructor(message: string, details: string[]) {
    super(message)
    this.name = 'ImportFailedError'
    this.details = details
  }
}

/** The bad rows an upload was refused for, from either the request check or the background import. */
export function importErrorDetails(error: unknown): string[] | undefined {
  if (error instanceof ImportFailedError) return error.details.length ? error.details : undefined
  if (error instanceof ApiError) {
    const details = (error.data as { details?: string[] } | undefined)?.details
    return details?.length ? details : undefined
  }
  return undefined
}

interface WaitOptions {
  pollMs?: number
  /** How long to wait before telling the person the import is still running on the server. */
  timeoutMs?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Follows a bulk upload until it ends: resolves with the finished job, or throws {@link ImportFailedError} if it failed.
 * A blip in the connection while waiting is retried -- the import itself carries on on the server.
 */
export async function waitForImport(first: ImportJob, { pollMs = 2000, timeoutMs = 30 * 60 * 1000 }: WaitOptions = {}): Promise<ImportJob> {
  let job = first
  const deadline = Date.now() + timeoutMs
  let misses = 0
  while (job.status === 'QUEUED' || job.status === 'RUNNING') {
    if (!job.id) throw new Error('The server did not say which import this is, so it cannot be followed. Check the list to see whether it went through.')
    if (Date.now() > deadline) {
      throw new Error('This import is taking longer than expected. It keeps running on the server -- check the list again in a few minutes.')
    }
    await sleep(pollMs)
    try {
      job = (await apiClient.get<ImportJob>(`/api/import-jobs/${job.id}`)).data
      misses = 0
    } catch (error) {
      misses += 1
      if (misses >= 5) throw error
    }
  }
  if (job.status === 'FAILED') throw new ImportFailedError(job.message ?? 'The import failed. Nothing was imported.', job.errors)
  return job
}
