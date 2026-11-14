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
export function useDashboardDrilldown(selection: { dimension: DrilldownDimension; value: string } | null, page = 0, size = 20) {
  return useQuery({
    queryKey: ['dashboard', 'drilldown', selection?.dimension, selection?.value, page, size],
    queryFn: () => getDashboardDrilldown(selection!.dimension, selection!.value, page, size),
    enabled: selection !== null,
    // The page being left stays up, dimmed, while the next one loads, so the drawer does not flash empty between pages.
    // Only within the same datapoint: another number's records must not flash up under this one's title.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === selection?.dimension && previousQuery?.queryKey[3] === selection?.value ? previous : undefined,
  })
}
