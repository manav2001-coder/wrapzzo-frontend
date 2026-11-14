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
  recipientPcode: string | null
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
  quickGiftsThisMonth: number
  quickGiftsPending: number
  /** PELs (units) on every order placed, cancelled ones aside. */
  pelsRequested: number
  /** Distinct doctors those PELs were requested for. */
  doctorsRequested: number
  /** PELs on orders the vendor has dispatched. */
  pelsDispatched: number
  /** Distinct doctors those dispatched PELs were sent for. */
  doctorsDispatched: number
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
  | 'pelsDispatched'
  | 'pipelineStage'
  | 'quickGiftsThisMonth'
  | 'orderStage'
  | 'uncoveredDoctors'

export async function getDashboardDrilldown(dimension: DrilldownDimension, value: string): Promise<DashboardDrilldown> {
  const { data } = await apiClient.get<DashboardDrilldown>('/api/dashboard/drilldown', { params: { dimension, value } })
  return data
}

export type DashboardRange = '7d' | '30d' | '90d' | 'year' | 'all'
export type InsightStage = 'APPROVAL' | 'ARTWORK' | 'PRODUCTION'

export interface InsightPeriod {
  requested: number
  dispatched: number
  doctorsRequested: number
  doctorsDispatched: number
  /** Average days from request to dispatch of what was dispatched in the period; null when nothing was. */
  avgDaysToDispatch: number | null
}

export interface StageAging {
  stage: InsightStage
  count: number
  /** Orders that have waited longer than thresholdDays here. */
  stuck: number
  oldestDays: number
  thresholdDays: number
}

export interface TeamMember {
  userId: string
  name: string
  unitName: string
  requested: number
  dispatched: number
  doctorsAssigned: number
  doctorsCovered: number
  inPipeline: number
  lastActivityAt: string | null
}

export interface DashboardInsights {
  /** PERSONAL = sees only their own records; TEAM = also sees the people below them. */
  scope: 'PERSONAL' | 'TEAM'
  range: DashboardRange
  current: InsightPeriod
  previous: InsightPeriod | null
  coverage: { assigned: number; covered: number }
  stages: StageAging[]
  rejectedRequests: number
  weekly: { weekLabel: string; weekStart: string; requested: number; dispatched: number }[]
  teamSize: number
  team: TeamMember[]
  /** Present only for someone who may see prices (the company admin). */
  spend: Spend | null
  /** Present only for someone who may see which vendor makes an order (the company admin). */
  vendors: VendorScore[] | null
}

export interface Spend {
  total: number
  /** Null for "all time". */
  previousTotal: number | null
  costPerPel: number | null
  byGift: { name: string; amount: number }[]
  byUnit: { name: string; amount: number }[]
}

export interface VendorScore {
  vendorId: string
  name: string
  orders: number
  dispatched: number
  open: number
  /** Open orders more than 10 days old. */
  slowOpen: number
  avgDaysToDispatch: number | null
  /** Artwork versions uploaded, and how many were sent back. */
  designs: number
  designsRejected: number
}

export async function getDashboardInsights(range: DashboardRange): Promise<DashboardInsights> {
  const { data } = await apiClient.get<DashboardInsights>('/api/dashboard/insights', { params: { range } })
  return data
}

/** The orders behind the dashboard for a period, as a spreadsheet the browser saves. */
export async function downloadDashboardExport(range: DashboardRange): Promise<void> {
  const response = await apiClient.get<Blob>('/api/dashboard/export', { params: { range }, responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `pel-orders-${range}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
