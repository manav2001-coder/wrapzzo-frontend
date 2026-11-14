import { format } from 'date-fns'
import { BarChart3, ClipboardCheck, Clock, Palette, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppTabs } from '@/components/app-tabs'
import { DonutChart } from '@/components/charts/donut-chart'
import { MiniBarChart } from '@/components/charts/mini-bar-chart'
import { MultiLineChart } from '@/components/charts/multi-line-chart'
import { EmptyState } from '@/components/empty-state'
import { usePermissions } from '@/components/permission-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useQuickGiftName } from '@/hooks/use-menu-labels'
import { useDashboard, useDashboardInsights } from '@/hooks/useDashboard'
import type { DashboardRange } from '@/api/dashboard'
import { usePendingArtworkPreview, usePendingOrderApprovalCount } from '@/hooks/useApprovalCounts'
import { humanize } from '@/lib/format'
import { P } from '@/lib/permissions'
import { statusColor } from '@/lib/statusColors'
import { AttentionCard, type AttentionItem } from './AttentionCard'
import { DashboardDrilldownDialog, type DrilldownSelection } from './DashboardDrilldownDialog'
import { OrderTimeline } from './OrderTimeline'
import { CoverageCard } from './CoverageCard'
import { ExportButton } from './ExportButton'
import { SpendCard } from './SpendCard'
import { VendorScorecard } from './VendorScorecard'
import { PeriodKpis } from './PeriodKpis'
import { RangePicker } from './RangePicker'
import { StageAgingCard } from './StageAging'
import { TeamPanel } from './TeamPanel'
import { QuickGiftActivityDialog } from './QuickGiftActivityDialog'
import { RecentActivityFeed } from './RecentActivityFeed'

const SOURCE_LABELS: Record<string, string> = { BULK_GIFT: 'Bulk PEL ordering' }
const SOURCE_COLORS: Record<string, string> = { QUICK_GIFT: '#f59e0b', BULK_GIFT: '#0d9488' }

function greetingFor(date: Date): string {
  const hour = date.getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

function ChartPanel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mb-2 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

/** The company's (or, for a member, their own) gifting at a glance; every number drills into its records. */
export function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('30d')
  const { data, isLoading } = useDashboard()
  const { data: insights } = useDashboardInsights(range)
  const navigate = useNavigate()
  const { data: me } = useCurrentUser()
  const { hasAnyPermission } = usePermissions()
  const canReviewArtwork = hasAnyPermission([P.APPROVAL_VIEW])
  const { data: pendingArtwork } = usePendingArtworkPreview(canReviewArtwork)
  const { data: pendingOrderApprovals } = usePendingOrderApprovalCount(canReviewArtwork)
  const [drilldown, setDrilldown] = useState<DrilldownSelection>(null)
  const [selectedQuickGiftId, setSelectedQuickGiftId] = useState<string | null>(null)

  const quickGiftName = useQuickGiftName()
  const breakdowns = useMemo(() => {
    if (!data) return null
    const slices = (counts: Record<string, number>, label: (key: string) => string, color: (key: string) => string) =>
      Object.entries(counts).map(([key, value]) => ({ key, label: label(key), value, color: color(key) }))
    return {
      source: slices(data.orderSourceBreakdown, (k) => (k === 'QUICK_GIFT' ? quickGiftName : (SOURCE_LABELS[k] ?? humanize(k))), (k) => SOURCE_COLORS[k] ?? '#94a3b8'),
      quickGift: slices(data.quickGiftStatusBreakdown, humanize, statusColor),
      trend: (insights?.weekly ?? []).map((p) => ({ label: p.weekLabel, requested: p.requested, delivered: p.delivered })),
    }
  }, [data, insights, quickGiftName])

  if (isLoading || !data || !breakdowns) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const hasAnyActivity =
    data.giftsInProgress > 0 ||
    data.dispatched > 0 ||
    data.delivered > 0 ||
    data.quickGiftsThisMonth > 0 ||
    data.recentActivity.length > 0

  const personal = insights?.scope === 'PERSONAL'
  const stuckOrders = (insights?.stages ?? []).reduce((sum, st) => sum + st.stuck, 0)
  const attention: AttentionItem[] = [
    ...(canReviewArtwork
      ? [
          {
            key: 'orders',
            icon: ClipboardCheck,
            label: 'Requests to approve',
            hint: 'Review and approve new PEL requests',
            count: pendingOrderApprovals ?? 0,
            onClick: () => navigate('/approvals'),
          },
          {
            key: 'artwork',
            icon: Palette,
            label: 'Artwork proofs to review',
            hint: pendingArtwork?.next ? `Next: ${pendingArtwork.next.orderDisplayId} · ${pendingArtwork.next.recipientName ?? pendingArtwork.next.giftName ?? ''}` : 'Open your approvals',
            count: pendingArtwork?.count ?? 0,
            onClick: () => navigate('/approvals'),
          },
        ]
      : []),
    {
      key: 'rejected',
      icon: Undo2,
      label: 'Requests turned down',
      hint: 'See why, then raise them again if needed',
      count: insights?.rejectedRequests ?? 0,
      onClick: () => setDrilldown({ dimension: 'quickGiftStatus', value: 'REJECTED' }),
    },
    {
      key: 'stuck',
      icon: Clock,
      label: 'Orders waiting too long',
      hint: 'Open the stage that is slowest',
      count: stuckOrders,
      onClick: () => {
        const worst = [...(insights?.stages ?? [])].sort((x, y) => y.stuck - x.stuck)[0]
        if (worst) setDrilldown({ dimension: 'orderStage', value: worst.stage })
      },
    },
  ]

  const now = new Date()
  const firstName = me?.name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-7 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{format(now, 'EEEE, d MMMM')}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">
              {greetingFor(now)}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
              <span className="font-semibold text-foreground">{data.companyName}</span>
              {' · '}
              {data.companyWide ? 'Everything happening across your company' : 'Everything happening in your area'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <RangePicker value={range} onChange={setRange} />
        </div>
        <ExportButton range={range} />
      </div>

      {!hasAnyActivity ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing to show yet"
          description={
            data.companyWide
              ? 'Once your team starts raising requests, this dashboard fills in automatically.'
              : "Once you send a request, it shows up here."
          }
        />
      ) : (
        <>
          {insights && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className={personal ? 'order-2 lg:col-span-2' : 'lg:col-span-3'}>
                  <AttentionCard items={attention} />
                </div>
                <div className={personal ? 'order-1 lg:col-span-3' : 'lg:col-span-2'}>
                  <CoverageCard
                    personal={personal}
                    assigned={insights.coverage.assigned}
                    covered={insights.coverage.covered}
                    onSeeLeft={() => setDrilldown({ dimension: 'uncoveredDoctors', value: range })}
                  />
                </div>
              </div>
              <PeriodKpis current={insights.current} previous={insights.previous} onSelect={(dimension) => setDrilldown({ dimension, value: '' })} />
              <StageAgingCard stages={insights.stages} onSelectStage={(stage) => setDrilldown({ dimension: 'orderStage', value: stage })} />
              {!personal && <TeamPanel team={insights.team} teamSize={insights.teamSize} />}
              {(insights.spend || insights.vendors) && (
                <>
                  {insights.spend && <SpendCard spend={insights.spend} />}
                  {insights.vendors && <VendorScorecard vendors={insights.vendors} />}
                </>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <SectionTitle
                title="Recent orders"
                description={data.companyWide ? 'Every PEL order in the company, ordered to delivered.' : 'Your PEL orders, ordered to delivered.'}
              />
              <OrderTimeline orders={data.recentOrders} />
            </section>
            <section className="flex flex-col lg:col-span-2">
              <SectionTitle title="Latest activity" description="What your team has been doing." />
              <RecentActivityFeed className="flex-1" items={data.recentActivity} onSelectQuickGift={setSelectedQuickGiftId} />
            </section>
          </div>

          {!personal && (
          <section>
            <SectionTitle title="Insights" description="Click a point, slice or bar to see the records behind it." />
            <AppTabs
              variant="pills"
              defaultValue="activity"
              tabs={[
                {
                  value: 'activity',
                  label: 'Weekly activity',
                  content: (
                    <ChartPanel title="PELs requested vs delivered" description="Last 12 weeks">
                      <MultiLineChart
                        data={breakdowns.trend}
                        series={[
                          { key: 'requested', label: 'Requested', color: SOURCE_COLORS.QUICK_GIFT },
                          { key: 'delivered', label: 'Delivered', color: '#22c55e' },
                        ]}
                      />
                    </ChartPanel>
                  ),
                },
                {
                  value: 'status',
                  label: 'Status',
                  content: (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <ChartPanel title="Orders by source">
                        <DonutChart data={breakdowns.source} emptyText="No orders yet." onSelect={(key) => setDrilldown({ dimension: 'orderSource', value: key })} />
                      </ChartPanel>
                      <ChartPanel title={`${quickGiftName} status`}>
                        <DonutChart
                          data={breakdowns.quickGift}
                          emptyText="No requests yet."
                          onSelect={(key) => setDrilldown({ dimension: 'quickGiftStatus', value: key })}
                        />
                      </ChartPanel>
                    </div>
                  ),
                },
                {
                  value: 'top',
                  label: "What's performing",
                  content: (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <ChartPanel title="Top PELs">
                        <MiniBarChart
                          data={data.topGifts.map((g) => ({ label: g.giftName, value: g.orderCount, color: '#6366f1' }))}
                          seriesName="Orders"
                          emptyText="No orders yet."
                          onSelect={(bar) => setDrilldown({ dimension: 'topGift', value: bar.label })}
                        />
                      </ChartPanel>
                      <ChartPanel title={data.companyWide ? 'Top departments' : 'Your department'}>
                        <MiniBarChart
                          data={data.topDepartments.map((d) => ({ label: d.departmentName, value: d.orderCount, color: '#7c3aed' }))}
                          seriesName="Orders"
                          emptyText="No orders yet."
                          onSelect={(bar) => setDrilldown({ dimension: 'topDepartment', value: bar.label })}
                        />
                      </ChartPanel>
                    </div>
                  ),
                },
              ]}
            />
          </section>
          )}
        </>
      )}

      <DashboardDrilldownDialog selection={drilldown} onHide={() => setDrilldown(null)} />
      <QuickGiftActivityDialog quickGiftId={selectedQuickGiftId} onHide={() => setSelectedQuickGiftId(null)} />
    </div>
  )
}
