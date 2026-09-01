import { apiClient } from '@/lib/axiosClient'
import type { CampaignStatus } from '@/api/campaigns'

export interface TopGift {
  giftName: string
  orderCount: number
}

export interface TopCampaign {
  campaignId: string
  campaignName: string
  orderCount: number
}

export interface TopDepartment {
  departmentName: string
  orderCount: number
}

export interface UpcomingDeadline {
  campaignId: string
  displayId: string
  campaignName: string
  deadline: string
}

export interface RecentCampaign {
  id: string
  displayId: string
  name: string
  status: CampaignStatus
  fieldCount: number
  submissionDeadline: string | null
  ownerName: string
  createdAt: string
}

export interface ActivityItem {
  actorName: string
  verb: string
  subject: string
  at: string
  /** Set when the activity is campaign-related -- the item links to /campaigns/{campaignId}. */
  campaignId: string | null
  /** Set when the activity is Quick Gift-related -- the item opens that request's detail dialog. */
  quickGiftId: string | null
}

export interface TrendPoint {
  weekLabel: string
  /** ISO date (Monday of that week) -- the drilldown key for dimension "week". */
  weekStart: string
  campaignSubmissions: number
  quickGiftRequests: number
}

export interface DashboardSummary {
  companyName: string
  /** true = Company Admin's company-wide view; false = scoped to just this Member's own activity. */
  companyWide: boolean
  campaignsRunning: number
  giftsInProgress: number
  dispatched: number
  delivered: number
  submissionsPending: number
  quickGiftsThisMonth: number
  quickGiftsPending: number
  /** Sum of totalPrice for every non-cancelled order approved (i.e. created) this calendar month. */
  monthlySpend: number
  /** Order counts by source -- "CAMPAIGN" / "QUICK_GIFT" / "BULK_GIFT". */
  orderSourceBreakdown: Record<string, number>
  /** Quick Gift request counts by status -- "SUBMITTED" / "APPROVED" / "REJECTED". */
  quickGiftStatusBreakdown: Record<string, number>
  /** Campaign submission counts by status -- "PENDING" / "APPROVED" / "REJECTED". */
  submissionStatusBreakdown: Record<string, number>
  activityTrend: TrendPoint[]
  topGifts: TopGift[]
  topCampaigns: TopCampaign[]
  topDepartments: TopDepartment[]
  upcomingDeadlines: UpcomingDeadline[]
  recentCampaigns: RecentCampaign[]
  recentActivity: ActivityItem[]
}

export async function getDashboard(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/dashboard')
  return data
}

export interface DrilldownRow {
  displayId: string | null
  title: string
  subtitle: string
  status: string
  at: string
  /** Set when the row traces back to a campaign -- makes it clickable. */
  campaignId: string | null
  /** Set only where an order's price is meaningful (order/monthly-spend rows) -- null elsewhere. */
  amount: number | null
  /** 'CAMPAIGN' | 'QUICK_GIFT' | 'BULK_GIFT' -- set only on monthly-spend rows, for grouping. Null elsewhere. */
  source: string | null
}

export interface DashboardDrilldown {
  title: string
  rows: DrilldownRow[]
}

export type DrilldownDimension =
  | 'orderSource'
  | 'quickGiftStatus'
  | 'submissionStatus'
  | 'topGift'
  | 'topDepartment'
  | 'week'
  | 'monthlySpend'
  | 'pipelineStage'
  | 'quickGiftsThisMonth'

export async function getDashboardDrilldown(dimension: DrilldownDimension, value: string): Promise<DashboardDrilldown> {
  const { data } = await apiClient.get<DashboardDrilldown>('/api/dashboard/drilldown', { params: { dimension, value } })
  return data
}
