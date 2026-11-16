import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAppSelector } from '@/app/hooks'
import { changePassword, getProfile, removePhoto, updatePhone, uploadPhoto, type ProfileKind, type UserProfile, type VendorProfile } from '@/api/profile'
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user'

const profileKey = (kind: ProfileKind) => ['profile', kind] as const

/** The signed-in person's (or vendor's) own profile. */
export function useProfile<K extends ProfileKind>(kind: K) {
  const signedIn = useAppSelector((state) => Boolean(kind === 'user' ? state.auth.accessToken : state.vendorAuth.accessToken))
  return useQuery<K extends 'user' ? UserProfile : VendorProfile>({
    queryKey: profileKey(kind),
    queryFn: () => getProfile(kind as never) as never,
    enabled: signedIn,
    staleTime: 60_000,
  })
}

/** The edits a profile allows. Each refreshes the profile, and a person's picture also lives in /me, which the header reads. */
export function useProfileActions(kind: ProfileKind) {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: profileKey(kind) })
    if (kind === 'user') void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
  }
  return {
    savePhone: useMutation({ mutationFn: (phone: string) => updatePhone(kind, phone), onSuccess: refresh }),
    savePhoto: useMutation({ mutationFn: (picture: Blob) => uploadPhoto(kind, picture), onSuccess: refresh }),
    deletePhoto: useMutation({ mutationFn: () => removePhoto(kind), onSuccess: refresh }),
    savePassword: useMutation({ mutationFn: (input: { currentPassword: string; newPassword: string; confirmPassword: string }) => changePassword(kind, input) }),
  }
}
