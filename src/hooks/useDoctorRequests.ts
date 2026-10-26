import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveDoctorChangeRequest,
  createDoctorChangeRequest,
  listMyDoctorChangeRequests,
  listPendingDoctorChangeRequests,
  rejectDoctorChangeRequest,
  type CreateDoctorChangeInput,
} from '@/api/doctorRequests'

export function useMyDoctorChangeRequests() {
  return useQuery({ queryKey: ['doctor-requests', 'mine'], queryFn: listMyDoctorChangeRequests })
}

export function useCreateDoctorChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDoctorChangeInput) => createDoctorChangeRequest(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctor-requests'] }),
  })
}

export function usePendingDoctorChangeRequests() {
  return useQuery({ queryKey: ['doctor-requests', 'pending-review'], queryFn: listPendingDoctorChangeRequests })
}

export function useApproveDoctorChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveDoctorChangeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-requests'] })
      queryClient.invalidateQueries({ queryKey: ['recipients'] })
    },
  })
}

export function useRejectDoctorChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDoctorChangeRequest(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctor-requests'] }),
  })
}
