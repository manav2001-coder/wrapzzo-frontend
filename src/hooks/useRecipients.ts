import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRecipient, listRecipients, listUpcomingBirthdays, updateRecipient, type CreateRecipientInput } from '@/api/recipients'
import { useHasPermission } from '@/hooks/usePermissions'

export function useRecipients() {
  const canView = useHasPermission('recipient.manage')
  return useQuery({ queryKey: ['recipients'], queryFn: listRecipients, enabled: canView })
}

export function useCreateRecipient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRecipientInput) => createRecipient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] })
      queryClient.invalidateQueries({ queryKey: ['recipients', 'upcoming-birthdays'] })
    },
  })
}

export function useUpdateRecipient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateRecipientInput }) => updateRecipient(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] })
      queryClient.invalidateQueries({ queryKey: ['recipients', 'upcoming-birthdays'] })
    },
  })
}

export function useUpcomingBirthdays(days = 30) {
  const canView = useHasPermission('recipient.manage')
  return useQuery({
    queryKey: ['recipients', 'upcoming-birthdays', days],
    queryFn: () => listUpcomingBirthdays(days),
    enabled: canView,
  })
}
