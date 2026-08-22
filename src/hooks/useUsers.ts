import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bulkImportUsers, listCompanyUsers, type BulkImportUserRow } from '@/api/users'

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
