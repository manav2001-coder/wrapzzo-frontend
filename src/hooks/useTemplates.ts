import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAccessControlCatalog } from '@/api/accessControls'
import { listFeatures, setFeatureActive } from '@/api/features'
import {
  addTemplateReferences,
  bulkAssignUserTemplates,
  cloneTemplate,
  createTemplate,
  deleteTemplate,
  getUserTemplates,
  listSystemTemplates,
  listTemplates,
  removeTemplateReference,
  replaceUserTemplates,
  updateTemplate,
  type TemplateInput,
} from '@/api/templates'

export function useAccessControlCatalog() {
  return useQuery({
    queryKey: ['accessControlCatalog'],
    queryFn: listAccessControlCatalog,
    staleTime: Infinity,
  })
}

/** A company's templates plus the system masters; with no company (platform staff), just the system masters. */
export function useTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['templates', companyId ?? 'system'],
    queryFn: () => (companyId ? listTemplates(companyId) : listSystemTemplates()),
  })
}

function useTemplateMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] })
      void queryClient.invalidateQueries({ queryKey: ['roles'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useCreateTemplate(companyId: string | null) {
  return useTemplateMutation((input: TemplateInput) => createTemplate(companyId, input))
}

export function useUpdateTemplate() {
  return useTemplateMutation(({ templateId, input }: { templateId: string; input: TemplateInput }) => updateTemplate(templateId, input))
}

export function useCloneTemplate(companyId: string) {
  return useTemplateMutation(({ templateId, name }: { templateId: string; name: string }) => cloneTemplate(companyId, templateId, name))
}

export function useDeleteTemplate() {
  return useTemplateMutation((templateId: string) => deleteTemplate(templateId))
}

export function useFeatures() {
  return useQuery({ queryKey: ['features'], queryFn: listFeatures })
}

export function useSetFeatureActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ featureId, active }: { featureId: string; active: boolean }) => setFeatureActive(featureId, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['features'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useAddTemplateReferences() {
  return useTemplateMutation(({ templateId, templateIds }: { templateId: string; templateIds: string[] }) =>
    addTemplateReferences(templateId, templateIds),
  )
}

export function useRemoveTemplateReference() {
  return useTemplateMutation(({ templateId, referencedId }: { templateId: string; referencedId: string }) =>
    removeTemplateReference(templateId, referencedId),
  )
}

export function useUserTemplates(companyId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['userTemplates', companyId, userId],
    queryFn: () => getUserTemplates(companyId!, userId!),
    enabled: Boolean(companyId) && Boolean(userId),
  })
}

export function useReplaceUserTemplates(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, templateIds }: { userId: string; templateIds: string[] }) => replaceUserTemplates(companyId, userId, templateIds),
    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: ['userTemplates', companyId, userId] })
      void queryClient.invalidateQueries({ queryKey: ['templates'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useBulkAssignUserTemplates(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, templateIds }: { userIds: string[]; templateIds: string[] }) => bulkAssignUserTemplates(companyId, userIds, templateIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userTemplates', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['templates'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
