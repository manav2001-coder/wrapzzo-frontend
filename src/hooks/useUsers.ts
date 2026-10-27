import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkImportUsers,
  deleteUser,
  listCompanyOrgUnits,
  listCompanyUsers,
  makeCompanyAdmin,
  removeCompanyAdmin,
  setExtraOrgUnits,
  type BulkImportUserRow,
} from '@/api/users'
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user'

export function useCompanyUsers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['companyUsers', companyId],
    queryFn: () => listCompanyUsers(companyId!),
    enabled: Boolean(companyId),
  })
}

export function useBulkImportUsers(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: BulkImportUserRow[]) => bulkImportUsers(companyId, rows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] }),
  })
}

export function useMakeCompanyAdmin(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => makeCompanyAdmin(companyId, userId),
    // Also refresh our own nav/permissions -- covers the edge case of an admin promoting
    // themselves in another role, and is a no-op cost otherwise.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] })
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    },
  })
}

export function useRemoveCompanyAdmin(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeCompanyAdmin(companyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] })
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] }),
  })
}

export function useDeleteUser(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteUser(companyId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] }),
  })
}
