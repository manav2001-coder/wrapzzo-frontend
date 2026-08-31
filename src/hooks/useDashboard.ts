import { useQuery } from '@tanstack/react-query'
import { getDashboard, getDashboardDrilldown, type DrilldownDimension } from '@/api/dashboard'

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
}

/** Fetches only once a datapoint is actually clicked -- pass null to leave it idle. */
export function useDashboardDrilldown(selection: { dimension: DrilldownDimension; value: string } | null) {
  return useQuery({
    queryKey: ['dashboard', 'drilldown', selection?.dimension, selection?.value],
    queryFn: () => getDashboardDrilldown(selection!.dimension, selection!.value),
    enabled: selection !== null,
  })
}
