import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addMyVendor, listMyVendors, type AddMyVendorInput } from '@/api/myVendors'

const myVendorsKey = ['my-vendors'] as const

export function useMyVendors() {
  return useQuery({ queryKey: myVendorsKey, queryFn: listMyVendors })
}

export function useAddMyVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMyVendorInput) => addMyVendor(input),
    onSuccess: (data) => queryClient.setQueryData(myVendorsKey, data),
  })
}
