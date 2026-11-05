import { format } from 'date-fns'
import { BarChart3, Clock, Palette, Zap } from 'lucide-react'
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
import { useDashboard } from '@/hooks/useDashboard'
import { usePendingArtworkApprovals } from '@/hooks/useOrderDesigns'
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
import { RecentCampaignsCard } from './RecentCampaignsCard'

const SOURCE_LABELS: Record<string, string> = { CAMPAIGN: 'Campaign', QUICK_GIFT: 'Quick Gift', BULK_GIFT: 'Bulk Gifting' }
const SOURCE_COLORS: Record<string, string> = { CAMPAIGN: '#6366f1', QUICK_GIFT: '#f59e0b', BULK_GIFT: '#0d9488' }

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
  const { data: pendingArtwork } = usePendingArtworkApprovals(canReviewArtwork)
  const [drilldown, setDrilldown] = useState<DrilldownSelection>(null)
  const [selectedQuickGiftId, setSelectedQuickGiftId] = useState<string | null>(null)

  const breakdowns = useMemo(() => {
    if (!data) return null
    const slices = (counts: Record<string, number>, label: (key: string) => string, color: (key: string) => string) =>
      Object.entries(counts).map(([key, value]) => ({ key, label: label(key), value, color: color(key) }))
    return {
      source: slices(data.orderSourceBreakdown, (k) => SOURCE_LABELS[k] ?? humanize(k), (k) => SOURCE_COLORS[k] ?? '#94a3b8'),
      quickGift: slices(data.quickGiftStatusBreakdown, humanize, statusColor),
      submission: slices(data.submissionStatusBreakdown, humanize, (k) => (k === 'PENDING' ? statusColor('SUBMITTED') : statusColor(k))),
      trend: data.activityTrend.map((p) => ({ label: p.weekLabel, CAMPAIGN: p.campaignSubmissions, QUICK_GIFT: p.quickGiftRequests })),
    }
  }, [data])

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
    data.campaignsRunning > 0 ||
    data.giftsInProgress > 0 ||
    data.dispatched > 0 ||
    data.delivered > 0 ||
    data.quickGiftsThisMonth > 0 ||
    data.recentCampaigns.length > 0 ||
    data.recentActivity.length > 0

  const attention: AttentionItem[] = [
    ...(canReviewArtwork
      ? [
          {
            key: 'artwork',
            icon: Palette,
            label: 'Artwork proofs to review',
            hint: pendingArtwork?.[0] ? `Next: ${pendingArtwork[0].orderDisplayId} · ${pendingArtwork[0].recipientName ?? pendingArtwork[0].giftName ?? ''}` : 'Open your approvals',
            count: pendingArtwork?.length ?? 0,
            onClick: () => navigate('/approvals'),
          },
        ]
      : []),
    {
      key: 'quickGift',
      icon: Zap,
      label: 'Quick Gift requests pending',
      hint: data.companyWide ? 'Waiting for approval' : 'Waiting on your approver',
      count: data.quickGiftsPending,
      onClick: () => navigate(data.companyWide ? '/approvals' : '/quick-gift'),
    },
    {
      key: 'submissions',
      icon: Clock,
      label: 'Campaign submissions pending',
      hint: 'Waiting for review',
      count: data.submissionsPending,
      onClick: () => navigate(data.companyWide ? '/approvals' : '/my-campaigns'),
    },
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
                <span className="font-bold tabular-nums">{data.quickGiftsThisMonth}</span> Quick Gifts this month
              </button>
              <button
                type="button"
                onClick={() => navigate(data.companyWide ? '/campaigns' : '/my-campaigns')}
                className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-background"
              >
                <span className="font-bold tabular-nums">{data.campaignsRunning}</span> Campaigns running
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
              ? 'Once your team starts campaigns and Quick Gift requests, this dashboard fills in automatically.'
              : "Once you're part of a campaign or send a Quick Gift, it shows up here."
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
                description={data.companyWide ? 'Every gift order in the company, ordered to delivered.' : 'Your gift orders, ordered to delivered.'}
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
                          { key: 'CAMPAIGN', label: 'Campaign submissions', color: SOURCE_COLORS.CAMPAIGN },
                          { key: 'QUICK_GIFT', label: 'Quick Gift requests', color: SOURCE_COLORS.QUICK_GIFT },
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
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <ChartPanel title="Orders by source">
                        <DonutChart data={breakdowns.source} emptyText="No orders yet." onSelect={(key) => setDrilldown({ dimension: 'orderSource', value: key })} />
                      </ChartPanel>
                      <ChartPanel title="Quick Gift status">
                        <DonutChart
                          data={breakdowns.quickGift}
                          emptyText="No Quick Gift requests yet."
                          onSelect={(key) => setDrilldown({ dimension: 'quickGiftStatus', value: key })}
                        />
                      </ChartPanel>
                      <ChartPanel title="Campaign submission status">
                        <DonutChart
                          data={breakdowns.submission}
                          emptyText="No submissions yet."
                          onSelect={(key) => setDrilldown({ dimension: 'submissionStatus', value: key })}
                        />
                      </ChartPanel>
                    </div>
                  ),
                },
                {
                  value: 'top',
                  label: "What's performing",
                  content: (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <ChartPanel title="Top gifts">
                        <MiniBarChart
                          data={data.topGifts.map((g) => ({ label: g.giftName, value: g.orderCount, color: SOURCE_COLORS.CAMPAIGN }))}
                          seriesName="Orders"
                          emptyText="No orders yet."
                          onSelect={(bar) => setDrilldown({ dimension: 'topGift', value: bar.label })}
                        />
                      </ChartPanel>
                      <ChartPanel title="Top campaigns">
                        <MiniBarChart
                          data={data.topCampaigns.map((c) => ({ label: c.campaignName, value: c.orderCount, color: SOURCE_COLORS.QUICK_GIFT }))}
                          seriesName="Orders"
                          emptyText="No campaign orders yet."
                          onSelect={(bar) => {
                            const campaign = data.topCampaigns.find((c) => c.campaignName === bar.label)
                            if (campaign) navigate(`/campaigns/${campaign.campaignId}`)
                          }}
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
                { value: 'campaigns', label: 'Campaigns', content: <RecentCampaignsCard campaigns={data.recentCampaigns} /> },
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
