import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  approveOrder,
  getOrderApprovalSettings,
  listPendingOrderApprovals,
  rejectOrder,
  setOrderApprovalSettings,
} from '@/api/orderApprovals'

const PENDING_KEY = ['order-approvals', 'pending'] as const
const SETTINGS_KEY = ['order-approval-settings'] as const

export function usePendingOrderApprovals(enabled = true) {
  return useQuery({ queryKey: PENDING_KEY, queryFn: listPendingOrderApprovals, enabled, refetchInterval: 60_000 })
}

/** Approving or declining changes the order itself too, so the Orders lists are refreshed as well. */
export function useDecideOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, comment, approve }: { orderId: string; comment?: string; approve: boolean }) =>
      approve ? approveOrder(orderId, comment) : rejectOrder(orderId, comment ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PENDING_KEY })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
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
