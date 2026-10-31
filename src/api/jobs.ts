import { apiClient } from '@/lib/axiosClient'

export type JobRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED'

/** One run of a background job. */
export interface JobRun {
  id: string
  jobName: string
  label: string
  status: JobRunStatus
  /** "Schedule", or the Super Admin who ran it again. */
  triggeredBy: string
  attempts: number
  startedAt: string
  finishedAt: string | null
  result: string | null
  error: string | null
}

export const JOBS_PATH = '/api/platform/jobs'

export async function retryJobRun(id: string): Promise<JobRun> {
  const { data } = await apiClient.post<JobRun>(`${JOBS_PATH}/${id}/retry`)
  return data
}

export async function removeJobRun(id: string): Promise<void> {
  await apiClient.delete(`${JOBS_PATH}/${id}`)
}
