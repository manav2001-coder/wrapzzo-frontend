import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  bulkImportUsers,
  deleteUser,
  listCompanyOrgUnits,
  makeCompanyAdmin,
  removeCompanyAdmin,
  setCompanyWide,
  setExtraOrgUnits,
  type BulkImportUserRow,
} from '@/api/users'
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user'

/** The page of users on screen lives under 'table-data' now that the list is paged on the server. */
function invalidateUserLists(queryClient: QueryClient, companyId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] }),
    queryClient.invalidateQueries({ queryKey: ['table-data'] }),
  ])
}

export function useBulkImportUsers(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: BulkImportUserRow[]) => bulkImportUsers(companyId, rows),
    onSuccess: () => invalidateUserLists(queryClient, companyId),
  })
}

export function useMakeCompanyAdmin(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => makeCompanyAdmin(companyId, userId),
    // Also refresh our own nav/permissions -- covers the edge case of an admin promoting
    // themselves in another role, and is a no-op cost otherwise.
    onSuccess: () => {
      invalidateUserLists(queryClient, companyId)
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    },
  })
}

export function useRemoveCompanyAdmin(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => removeCompanyAdmin(companyId, userId, roleId),
    onSuccess: () => {
      invalidateUserLists(queryClient, companyId)
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    },
  })
}

export function useCompanyOrgUnits(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['companyOrgUnits', companyId],
    queryFn: () => listCompanyOrgUnits(companyId!),
    enabled: Boolean(companyId) && enabled,
  })
}

export function useSetExtraOrgUnits(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, orgUnitIds }: { userId: string; orgUnitIds: string[] }) => setExtraOrgUnits(companyId, userId, orgUnitIds),
    onSuccess: () => invalidateUserLists(queryClient, companyId),
  })
}

export function useSetCompanyWide(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, companyWide }: { userId: string; companyWide: boolean }) => setCompanyWide(companyId, userId, companyWide),
    onSuccess: () => invalidateUserLists(queryClient, companyId),
  })
}

export function useDeleteUser(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteUser(companyId, userId),
    onSuccess: () => invalidateUserLists(queryClient, companyId),
  })
}
