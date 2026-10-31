import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateCompany,
  createCompany,
  type CompanyInput,
  deactivateCompany,
  getCompany,
  listCompanies,
  updateCompany,
  uploadCompanyLogo,
} from '@/api/companies'

const companiesKey = ['companies'] as const
const companyKey = (id: string) => ['companies', id] as const

/** `enabled` false for a company user, who cannot list companies and has no use for the list. */
export function useCompanies(enabled = true) {
  return useQuery({ queryKey: companiesKey, queryFn: listCompanies, enabled })
}

export function useCompany(id: string | undefined) {
  return useQuery({ queryKey: companyKey(id ?? ''), queryFn: () => getCompany(id!), enabled: Boolean(id) })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CompanyInput) => createCompany(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesKey }),
  })
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CompanyInput) => updateCompany(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKey(id), data)
      queryClient.invalidateQueries({ queryKey: companiesKey })
    },
  })
}

/** Activate or deactivate any company -- the id travels with the call, so one hook serves a whole list. */
export function useSetCompanyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => (active ? activateCompany(id) : deactivateCompany(id)),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKey(data.id), data)
      queryClient.invalidateQueries({ queryKey: companiesKey })
    },
  })
}

export function useUploadCompanyLogo(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(id, file),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKey(id), data)
      queryClient.invalidateQueries({ queryKey: companiesKey })
    },
  })
}
