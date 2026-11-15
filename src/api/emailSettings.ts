import { apiClient } from '@/lib/axiosClient'

/** Platform config > Email settings: whether the order-workflow emails are sent, and who last changed that. */
export interface EmailSettings {
  workflowEmailsEnabled: boolean
  /** null until someone has changed it. */
  updatedAt: string | null
  updatedByName: string | null
}

export const EMAIL_SETTINGS_PATH = '/api/platform/email-settings'

export async function getEmailSettings(): Promise<EmailSettings> {
  const { data } = await apiClient.get<EmailSettings>(EMAIL_SETTINGS_PATH)
  return data
}

export async function setWorkflowEmails(workflowEmailsEnabled: boolean): Promise<EmailSettings> {
  const { data } = await apiClient.put<EmailSettings>(EMAIL_SETTINGS_PATH, { workflowEmailsEnabled })
  return data
}
