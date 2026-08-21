import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateCompany,
  createCompany,
  deactivateCompany,
  getCompany,
  listCompanies,
  updateCompany,
  uploadCompanyLogo,
} from '@/api/companies'

const companiesKey = ['companies'] as const
const companyKey = (id: string) => ['companies', id] as const

export function useCompanies() {
  return useQuery({ queryKey: companiesKey, queryFn: listCompanies })
}

export function useCompany(id: string | undefined) {
  return useQuery({ queryKey: companyKey(id ?? ''), queryFn: () => getCompany(id!), enabled: Boolean(id) })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createCompany(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesKey }),
  })
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => updateCompany(id, name),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKey(id), data)
      queryClient.invalidateQueries({ queryKey: companiesKey })
    },
  })
}

export function useSetCompanyStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) => (active ? activateCompany(id) : deactivateCompany(id)),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKey(id), data)
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
