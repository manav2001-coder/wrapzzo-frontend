import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkCreateMyDoctors,
  createMyDoctor,
  listMyRecipientsPage,
  listUpcomingBirthdays,
  removeMyDoctor,
  searchRecipients,
  updateRecipient,
  type CreateRecipientInput,
  type Recipient,
} from '@/api/recipients'
import { useHasAccess } from '@/hooks/use-permission'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { P } from '@/lib/permissions'

/**
 * The doctors on the caller's own list, a page at a time as the picker scrolls, narrowed by what is typed (the server searches).
 * The Doctors screen itself is a DataTable over /api/recipients/page.
 */
export function useMyRecipientsList(search: string) {
  return usePaginatedList({
    queryKey: ['recipients', 'mine', 'picker'],
    search,
    pageSize: 20,
    getItemKey: (recipient: Recipient) => recipient.id,
    fetchPage: ({ page, pageSize, search: term }) => listMyRecipientsPage(page, pageSize, term),
  })
}

/** "Pick an existing doctor" -- works for anyone who can send a gift, not just doctor.view holders. Empty query returns nothing (no full-directory dump). */
export function useRecipientSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['recipients', 'search', trimmed],
    queryFn: () => searchRecipients(trimmed),
    enabled: trimmed.length > 0,
  })
}

export function useUpdateRecipient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateRecipientInput }) => updateRecipient(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] })
      queryClient.invalidateQueries({ queryKey: ['table-data'] })
    },
  })
}

function useInvalidateRecipients() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['recipients'] })
    queryClient.invalidateQueries({ queryKey: ['table-data'] })
  }
}

/** Adding to, and removing from, the caller's own list apply at once. */
export function useCreateMyDoctor() {
  const invalidate = useInvalidateRecipients()
  return useMutation({ mutationFn: (input: CreateRecipientInput) => createMyDoctor(input), onSuccess: invalidate })
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
