import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkCreateMyDoctors,
  createMyDoctor,
  createRecipient,
  listMyRecipients,
  listRecipients,
  listUpcomingBirthdays,
  removeMyDoctor,
  searchRecipients,
  updateMyDoctor,
  updateRecipient,
  type CreateRecipientInput,
} from '@/api/recipients'
import { useHasAccess } from '@/hooks/use-permission'
import { P } from '@/lib/permissions'

export function useRecipients() {
  const canView = useHasAccess(P.DOCTOR_VIEW)
  return useQuery({ queryKey: ['recipients'], queryFn: listRecipients, enabled: canView })
}

/** An MR's own working list -- not the full shared directory. */
export function useMyRecipients() {
  return useQuery({ queryKey: ['recipients', 'mine'], queryFn: listMyRecipients })
}

/** "Pick an existing doctor" -- works for anyone who can send a gift, not just recipient.view holders. Empty query returns nothing (no full-directory dump). */
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

function useInvalidateRecipients() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['recipients'] })
    queryClient.invalidateQueries({ queryKey: ['recipients', 'upcoming-birthdays'] })
  }
}

/** The MR's own list: add, edit and remove apply at once. */
export function useCreateMyDoctor() {
  const invalidate = useInvalidateRecipients()
  return useMutation({ mutationFn: (input: CreateRecipientInput) => createMyDoctor(input), onSuccess: invalidate })
}

export function useUpdateMyDoctor() {
  const invalidate = useInvalidateRecipients()
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: CreateRecipientInput }) => updateMyDoctor(id, input), onSuccess: invalidate })
}

export function useBulkCreateMyDoctors() {
  const invalidate = useInvalidateRecipients()
  return useMutation({ mutationFn: (rows: CreateRecipientInput[]) => bulkCreateMyDoctors(rows), onSuccess: invalidate })
}

export function useRemoveMyDoctor() {
  const invalidate = useInvalidateRecipients()
  return useMutation({ mutationFn: (id: string) => removeMyDoctor(id), onSuccess: invalidate })
}

export function useUpcomingBirthdays(days = 30) {
  const canView = useHasAccess(P.DOCTOR_VIEW)
  return useQuery({
    queryKey: ['recipients', 'upcoming-birthdays', days],
    queryFn: () => listUpcomingBirthdays(days),
    enabled: canView,
  })
}
