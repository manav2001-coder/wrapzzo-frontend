import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAccessControlCatalog } from '@/api/accessControls'
import { getDesignationAccess, listDesignations, replaceDesignationAccess } from '@/api/designations'

export function useDesignations(companyId: string | undefined) {
  return useQuery({
    queryKey: ['designations', companyId],
    queryFn: () => listDesignations(companyId!),
    enabled: Boolean(companyId),
  })
}

export function useDesignationAccess(companyId: string | undefined, designation: string | undefined) {
  return useQuery({
    queryKey: ['designationAccess', companyId, designation],
    queryFn: () => getDesignationAccess(companyId!, designation!),
    enabled: Boolean(companyId) && Boolean(designation),
  })
}

export function useAccessControlCatalog() {
  return useQuery({
    queryKey: ['accessControlCatalog'],
    queryFn: listAccessControlCatalog,
    staleTime: Infinity,
  })
}

export function useReplaceDesignationAccess(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ designation, accessControlIds }: { designation: string; accessControlIds: string[] }) =>
      replaceDesignationAccess(companyId, designation, accessControlIds),
    onSuccess: (_data, { designation }) => {
      queryClient.invalidateQueries({ queryKey: ['designations', companyId] })
      queryClient.invalidateQueries({ queryKey: ['designationAccess', companyId, designation] })
    },
  })
}
