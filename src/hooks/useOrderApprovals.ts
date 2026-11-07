import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  approveOrder,
  getOrderApprovalSettings,
  rejectOrder,
  setOrderApprovalSettings,
} from '@/api/orderApprovals'
import { invalidateOrderLists } from '@/lib/invalidate-lists'

const SETTINGS_KEY = ['order-approval-settings'] as const

/** Approving or declining changes the order itself too, so the Orders lists are refreshed as well. */
export function useDecideOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, comment, approve }: { orderId: string; comment?: string; approve: boolean }) =>
      approve ? approveOrder(orderId, comment) : rejectOrder(orderId, comment ?? ''),
    // The queue (a page in a table), the tab counts and the order itself all change.
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useOrderApprovalSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: getOrderApprovalSettings })
}

export function useSetOrderApprovalSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: Parameters<typeof setOrderApprovalSettings>[0]) => setOrderApprovalSettings(settings),
    onSuccess: (settings) => queryClient.setQueryData(SETTINGS_KEY, settings),
  })
}
