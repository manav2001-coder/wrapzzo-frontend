import { useQuery } from '@tanstack/react-query'
import { listMyOrgUnits } from '@/api/myOrgUnits'

export function useMyOrgUnits() {
  return useQuery({ queryKey: ['my-org-units'], queryFn: listMyOrgUnits })
}
