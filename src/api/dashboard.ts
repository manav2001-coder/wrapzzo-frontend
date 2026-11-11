import { apiClient } from '@/lib/axiosClient'
import type { OrderStatus, StageEvent } from '@/api/orders'

export interface TopGift {
  giftName: string
  orderCount: number
}

export interface TopDepartment {
  departmentName: string
  orderCount: number
}

export interface ActivityItem {
  actorName: string
  verb: string
  subject: string
  at: string
  /** Set when the activity is Quick Gift-related -- the item opens that request's detail dialog. */
  quickGiftId: string | null
}

export interface TrendPoint {
  weekLabel: string
  /** ISO date (Monday of that week) -- the drilldown key for dimension "week". */
  weekStart: string
  quickGiftRequests: number
}

export interface OrderTimelineItem {
  id: string
  displayId: string
  giftName: string
  /** Null if the gift has no image, or the order has no gift (a rare/legacy case). */
  giftImageUrl: string | null
  recipientName: string
  requesterName: string
  status: OrderStatus
  /** 'QUICK_GIFT' | 'BULK_GIFT' (older orders may carry other sources) */
  source: string
  createdAt: string
  /** Every stage this order has actually passed through, oldest first, each with a real timestamp. */
  history: StageEvent[]
}

export interface DashboardSummary {
  companyName: string
  /** true = Company Admin's company-wide view; false = scoped to just this Member's own activity. */
  companyWide: boolean
  giftsInProgress: number
  dispatched: number
  delivered: number
  quickGiftsThisMonth: number
  quickGiftsPending: number
  /** PELs (units) on every order placed, cancelled ones aside. */
  pelsRequested: number
  /** Distinct doctors those PELs were requested for. */
  doctorsRequested: number
  /** PELs on delivered orders. */
  pelsServed: number
  /** Distinct doctors those delivered PELs reached. */
  doctorsServed: number
  /** Order counts by source -- "QUICK_GIFT" / "BULK_GIFT". */
  orderSourceBreakdown: Record<string, number>
  /** Quick Gift request counts by status -- "SUBMITTED" / "APPROVED" / "REJECTED". */
  quickGiftStatusBreakdown: Record<string, number>
  activityTrend: TrendPoint[]
  topGifts: TopGift[]
  topDepartments: TopDepartment[]
  recentActivity: ActivityItem[]
  recentOrders: OrderTimelineItem[]
}

export async function getDashboard(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/dashboard')
  return data
}

export interface DrilldownRow {
  displayId: string | null
  title: string
  subtitle: string
  /** Null on a per-doctor row, which sums several orders. */
  status: string | null
  at: string
  /** The PELs on the row (an order, or a doctor's total) -- null where a row has none. */
  quantity: number | null
}

export interface DashboardDrilldown {
  title: string
  rows: DrilldownRow[]
}

export type DrilldownDimension =
  | 'orderSource'
  | 'quickGiftStatus'
  | 'topGift'
  | 'topDepartment'
  | 'week'
  | 'pelsRequested'
  | 'pelsServed'
  | 'pipelineStage'
  | 'quickGiftsThisMonth'

export async function getDashboardDrilldown(dimension: DrilldownDimension, value: string): Promise<DashboardDrilldown> {
  const { data } = await apiClient.get<DashboardDrilldown>('/api/dashboard/drilldown', { params: { dimension, value } })
  return data
}
