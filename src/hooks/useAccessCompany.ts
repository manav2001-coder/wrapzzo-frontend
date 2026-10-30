import { useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'

/**
 * Which company the roles and templates screens work on: a company user's own, or -- for platform
 * staff, who belong to none -- the one they pick. `companyId` is undefined until a pick is made.
 */
export function useAccessCompany() {
  const { data: me } = useCurrentUser()
  const [picked, setPicked] = useState<string | null>(null)
  const isPlatformStaff = Boolean(me) && !me?.companyId
  return {
    isPlatformStaff,
    companyId: me?.companyId ?? picked ?? undefined,
    picked,
    setPicked,
  }
}
