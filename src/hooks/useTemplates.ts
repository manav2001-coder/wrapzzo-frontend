import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listCompanyFeatures, listFeatureCatalog, registerFeatures, setFeatureActive } from '@/api/features'
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

/**
 * The features of a scope: a company's (registered or not, on or off -- the feature master), or,
 * with no company, the whole catalogue (platform staff, for system templates). Pickers want
 * {@link assignableFeatures}.
 */
export function useFeatures(companyId: string | undefined) {
  return useQuery({
    queryKey: ['features', companyId ?? 'catalogue'],
    queryFn: () => (companyId ? listCompanyFeatures(companyId) : listFeatureCatalog()),
  })
}

/** What a template in this scope may carry: registered and switched on. */
export const assignableFeatures = <T extends { registered: boolean; active: boolean }>(features: T[] | undefined): T[] =>
  (features ?? []).filter((feature) => feature.registered && feature.active)

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

function useFeatureMutation<TVariables, TResult>(companyId: string, mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['features'] })
      void queryClient.invalidateQueries({ queryKey: ['templates', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useSetFeatureActive(companyId: string) {
  return useFeatureMutation(companyId, ({ featureId, active }: { featureId: string; active: boolean }) => setFeatureActive(companyId, featureId, active))
}

/** No ids = every feature the company is missing. */
export function useRegisterFeatures(companyId: string) {
  return useFeatureMutation(companyId, (featureIds?: string[]) => registerFeatures(companyId, featureIds))
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
