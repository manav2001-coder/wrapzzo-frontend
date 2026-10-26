import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRecipient,
  listMyRecipients,
  listRecipients,
  listUpcomingBirthdays,
  searchRecipients,
  updateRecipient,
  type CreateRecipientInput,
} from '@/api/recipients'
import { useHasPermission } from '@/hooks/usePermissions'

export function useRecipients() {
  const canView = useHasPermission('recipient.manage')
  return useQuery({ queryKey: ['recipients'], queryFn: listRecipients, enabled: canView })
}

/** An MR's own working list -- not the full shared directory. */
export function useMyRecipients() {
  return useQuery({ queryKey: ['recipients', 'mine'], queryFn: listMyRecipients })
}

/** "Pick an existing doctor" -- works for anyone who can send a gift, not just recipient.manage holders. Empty query returns nothing (no full-directory dump). */
export function useRecipientSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['recipients', 'search', trimmed],
    queryFn: () => searchRecipients(trimmed),
    enabled: trimmed.length > 0,
  })
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
