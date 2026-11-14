import { useQuery } from '@tanstack/react-query'
import { getDashboard, getDashboardDrilldown, getDashboardInsights, type DashboardRange, type DrilldownDimension } from '@/api/dashboard'

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
}

/** The role-shaped figures for a chosen period; the old range's data stays on screen while a new one loads. */
export function useDashboardInsights(range: DashboardRange) {
  return useQuery({ queryKey: ['dashboard', 'insights', range], queryFn: () => getDashboardInsights(range), placeholderData: (previous) => previous })
}

/** Fetches only once a datapoint is actually clicked -- pass null to leave it idle. */
export function useDashboardDrilldown(selection: { dimension: DrilldownDimension; value: string } | null) {
  return useQuery({
    queryKey: ['dashboard', 'drilldown', selection?.dimension, selection?.value],
    queryFn: () => getDashboardDrilldown(selection!.dimension, selection!.value),
    enabled: selection !== null,
  })
}
