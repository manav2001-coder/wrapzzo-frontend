import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateQuickGiftInput } from '@/api/quickGifts'
import {
  actOnRecurringOrderPlan,
  createRecurringOrderPlan,
  listMyRecurringOrderPlans,
  type RecurringPlanAction,
} from '@/api/recurringOrders'

export function useMyRecurringOrderPlans() {
  return useQuery({ queryKey: ['recurring-orders', 'mine'], queryFn: listMyRecurringOrderPlans })
}

/** Making a plan, or placing its next order now, also places a Quick Gift -- refresh those lists too. */
function invalidatePlacedOrders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recurring-orders'] })
  queryClient.invalidateQueries({ queryKey: ['quick-gifts'] })
  queryClient.invalidateQueries({ queryKey: ['orders'] })
}

export function useCreateRecurringOrderPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQuickGiftInput) => createRecurringOrderPlan(input),
    onSuccess: () => invalidatePlacedOrders(queryClient),
  })
}

export function useRecurringOrderPlanAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RecurringPlanAction }) => actOnRecurringOrderPlan(id, action),
    onSuccess: () => invalidatePlacedOrders(queryClient),
  })
}
