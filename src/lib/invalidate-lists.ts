import type { QueryClient } from '@tanstack/react-query'

/**
 * Something about orders changed (a proof decided, a vendor assigned, an order approved): re-read every order figure on screen --
 * the open order, the summary counts, and the page of the table, which lives under 'table-data' now that lists are paged on the server.
 */
export function invalidateOrderLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['platform-orders'] }),
    queryClient.invalidateQueries({ queryKey: ['table-data'] }),
    queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  ])
}
