import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bulkImportUsers, deleteUser, listCompanyUsers, makeCompanyAdmin, removeCompanyAdmin, type BulkImportUserRow } from '@/api/users'

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companyUsers', companyId] }),
  })
}

export function useRemoveCompanyAdmin(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeCompanyAdmin(companyId, userId),
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
