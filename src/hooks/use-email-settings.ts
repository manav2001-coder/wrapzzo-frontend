import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getEmailSettings, setWorkflowEmails } from '@/api/emailSettings'

const KEY = ['platform', 'emailSettings'] as const

/** Whether the order-workflow emails are on, for the Super Admin's Email settings screen. */
export function useEmailSettings() {
  return useQuery({ queryKey: KEY, queryFn: getEmailSettings })
}

/** Switches the order-workflow emails on or off; the screen shows what the server saved, with who changed it. */
export function useSetWorkflowEmails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => setWorkflowEmails(enabled),
    onSuccess: (saved) => queryClient.setQueryData(KEY, saved),
  })
}
