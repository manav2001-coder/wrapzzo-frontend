import { format } from 'date-fns'
import { BarChart3, Palette } from 'lucide-react'
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
import { useDashboard } from '@/hooks/useDashboard'
import { usePendingArtworkPreview } from '@/hooks/useApprovalCounts'
import { humanize } from '@/lib/format'
import { P } from '@/lib/permissions'
import { statusColor } from '@/lib/statusColors'
import { UpcomingBirthdaysWidget } from '@/modules/recipients/UpcomingBirthdaysWidget'
import { AttentionCard, type AttentionItem } from './AttentionCard'
import { DashboardDrilldownDialog, type DrilldownSelection } from './DashboardDrilldownDialog'
import { OrderTimeline } from './OrderTimeline'
import { PelStatsCard } from './PelStatsCard'
import { PipelineFlow } from './PipelineFlow'
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
  const { data, isLoading } = useDashboard()
  const navigate = useNavigate()
  const { data: me } = useCurrentUser()
  const { hasAnyPermission } = usePermissions()
  const canReviewArtwork = hasAnyPermission([P.APPROVAL_VIEW])
  const { data: pendingArtwork } = usePendingArtworkPreview(canReviewArtwork)
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
      trend: data.activityTrend.map((p) => ({ label: p.weekLabel, QUICK_GIFT: p.quickGiftRequests })),
    }
  }, [data, quickGiftName])

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

  const attention: AttentionItem[] = [
    ...(canReviewArtwork
      ? [
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
  ]

  const now = new Date()
  const firstName = me?.name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-7 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{format(now, 'EEEE, d MMMM')}</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
              {greetingFor(now)}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{data.companyName}</span>
              {' · '}
              {data.companyWide ? 'Everything happening across your company' : 'Everything happening in your area'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDrilldown({ dimension: 'quickGiftsThisMonth', value: '' })}
                className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-background"
              >
                <span className="font-bold tabular-nums">{data.quickGiftsThisMonth}</span> requests this month
              </button>
            </div>
          </div>
        </div>
      </header>

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
          <PelStatsCard
            requested={data.pelsRequested}
            doctors={data.doctorsRequested}
            served={data.pelsServed}
            doctorsServed={data.doctorsServed}
            onSelect={(dimension) => setDrilldown({ dimension, value: '' })}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PipelineFlow
                inProgress={data.giftsInProgress}
                dispatched={data.dispatched}
                delivered={data.delivered}
                onSelectStage={(stage) => setDrilldown({ dimension: 'pipelineStage', value: stage })}
              />
            </div>
            <div className="lg:col-span-2">
              <AttentionCard items={attention} />
            </div>
          </div>

          <UpcomingBirthdaysWidget />

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
                    <ChartPanel title="Last 12 weeks">
                      <MultiLineChart
                        data={breakdowns.trend}
                        series={[
                          { key: 'QUICK_GIFT', label: `${quickGiftName} requests`, color: SOURCE_COLORS.QUICK_GIFT },
                        ]}
                        onSelect={(index, seriesKey) => {
                          const point = data.activityTrend[index]
                          if (point) setDrilldown({ dimension: 'week', value: `${point.weekStart}:${seriesKey}` })
                        }}
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
        </>
      )}

      <DashboardDrilldownDialog selection={drilldown} onHide={() => setDrilldown(null)} />
      <QuickGiftActivityDialog quickGiftId={selectedQuickGiftId} onHide={() => setSelectedQuickGiftId(null)} />
    </div>
  )
}
