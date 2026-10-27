import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@/api/orders'
import {
  advanceWarehouseOrder,
  createWarehouse,
  listWarehouseOrders,
  listWarehouses,
  updateWarehouse,
  type WarehouseInput,
} from '@/api/warehouses'
import { LIVE_REFRESH_MS } from '@/lib/live-refresh'

export function useWarehouses() {
  return useQuery({ queryKey: ['warehouses'], queryFn: listWarehouses })
}

export function useSaveWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: WarehouseInput }) => (id ? updateWarehouse(id, input) : createWarehouse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

/** Polled -- the vendor dispatching an order is what puts it in the warehouse's inbound list. */
export function useWarehouseOrders() {
  return useQuery({ queryKey: ['warehouse-orders'], queryFn: listWarehouseOrders, refetchInterval: LIVE_REFRESH_MS })
}

export function useAdvanceWarehouseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => advanceWarehouseOrder(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
