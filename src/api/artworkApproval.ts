import { apiClient } from '@/lib/axiosClient'

/** Where to find the person holding a step's role: the nearest one above the AM, or anyone in the AM's division. */
export type ArtworkApprovalScope = 'REPORTING_LINE' | 'DIVISION'

export interface ArtworkApprovalStep {
  roleId: string
  /** Set by the server; not sent back. */
  roleName?: string
  scope: ArtworkApprovalScope
}

export interface ArtworkApprovalRoleOption {
  id: string
  name: string
}

export interface ArtworkApprovalSettings {
  /** Whether Wrappzo has switched Senior Artwork Approval on for the company -- steps can only be changed while it is. */
  enabled: boolean
  /** The simple "managers up the AM's line" count that applies while there are no steps. */
  levels: number
  steps: ArtworkApprovalStep[]
  /** The company's active roles, for the step picker. */
  roles: ArtworkApprovalRoleOption[]
}

export async function getArtworkApprovalSettings(): Promise<ArtworkApprovalSettings> {
  const { data } = await apiClient.get<ArtworkApprovalSettings>('/api/artwork-approval/steps')
  return data
}

/** Replaces the steps; an empty list goes back to the simple level count. */
export async function setArtworkApprovalSteps(steps: ArtworkApprovalStep[]): Promise<ArtworkApprovalSettings> {
  const { data } = await apiClient.put<ArtworkApprovalSettings>('/api/artwork-approval/steps', {
    steps: steps.map(({ roleId, scope }) => ({ roleId, scope })),
  })
  return data
}
