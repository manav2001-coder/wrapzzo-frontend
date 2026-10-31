import { useQuery } from '@tanstack/react-query'
import { getPlatformDashboard } from '@/api/platformDashboard'

export function usePlatformDashboard() {
  return useQuery({ queryKey: ['platform-dashboard'], queryFn: getPlatformDashboard })
}
