import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRole, deleteRole, listRoles, replaceRoleTemplates, updateRole, type RoleInput } from '@/api/roles'

export function useRoles(companyId: string | undefined) {
  return useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => listRoles(companyId!),
    enabled: Boolean(companyId),
  })
}

/** Role changes alter who can do what, so the caller's own permissions are refetched too. */
function useRoleMutation<TVariables, TResult>(companyId: string, mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['templates', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useCreateRole(companyId: string) {
  return useRoleMutation(companyId, (input: RoleInput) => createRole(companyId, input))
}

export function useUpdateRole(companyId: string) {
  return useRoleMutation(companyId, ({ roleId, input }: { roleId: string; input: RoleInput }) => updateRole(companyId, roleId, input))
}

export function useReplaceRoleTemplates(companyId: string) {
  return useRoleMutation(companyId, ({ roleId, templateIds }: { roleId: string; templateIds: string[] }) =>
    replaceRoleTemplates(companyId, roleId, templateIds),
  )
}

export function useDeleteRole(companyId: string) {
  return useRoleMutation(companyId, (roleId: string) => deleteRole(companyId, roleId))
}
