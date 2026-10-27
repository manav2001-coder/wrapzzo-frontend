import { BarChart3, CalendarDays, Clock, Megaphone, Zap } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { DonutChart } from '@/components/charts/donut-chart'
import { MiniBarChart } from '@/components/charts/mini-bar-chart'
import { MultiLineChart } from '@/components/charts/multi-line-chart'
import { EmptyState } from '@/components/empty-state'
import { SectionCard } from '@/components/section-card'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from '@/hooks/useDashboard'
import { humanize } from '@/lib/format'
import { statusColor } from '@/lib/statusColors'
import { UpcomingBirthdaysWidget } from '@/modules/recipients/UpcomingBirthdaysWidget'
import { DashboardDrilldownDialog, type DrilldownSelection } from './DashboardDrilldownDialog'
import { HeroSpendCard } from './HeroSpendCard'
import { OrderTimeline } from './OrderTimeline'
import { PipelineFlow } from './PipelineFlow'
import { QuickGiftActivityDialog } from './QuickGiftActivityDialog'
import { RecentActivityFeed } from './RecentActivityFeed'
import { RecentCampaignsCard } from './RecentCampaignsCard'

const SOURCE_LABELS: Record<string, string> = { CAMPAIGN: 'Campaign', QUICK_GIFT: 'Quick Gift', BULK_GIFT: 'Bulk Gifting' }
const SOURCE_COLORS: Record<string, string> = { CAMPAIGN: '#6366f1', QUICK_GIFT: '#f59e0b', BULK_GIFT: '#0d9488' }

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** The company's (or, for a member, their own) gifting at a glance; every number drills into its records. */
export function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const navigate = useNavigate()
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
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
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

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{data.companyName}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {data.companyWide
            ? "Here's everything happening across your campaigns, orders and Quick Gift requests."
            : "Here's what's happening with your campaigns, orders and Quick Gift requests."}
        </p>
      </div>

      <UpcomingBirthdaysWidget />

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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HeroSpendCard amount={data.monthlySpend} onClick={() => setDrilldown({ dimension: 'monthlySpend', value: '' })} />
            </div>
            <div className="lg:col-span-7">
              <PipelineFlow
                inProgress={data.giftsInProgress}
                dispatched={data.dispatched}
                delivered={data.delivered}
                onSelectStage={(stage) => setDrilldown({ dimension: 'pipelineStage', value: stage })}
              />
            </div>
          </div>

          <Section
            title="Order timeline"
            description={data.companyWide ? 'Every gift order in the company, ordered to delivered.' : 'Your gift orders, ordered to delivered.'}
          >
            <OrderTimeline orders={data.recentOrders} />
          </Section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              title="Campaigns running"
              value={data.campaignsRunning}
              icon={Megaphone}
              onClick={() => navigate(data.companyWide ? '/campaigns' : '/my-campaigns')}
            />
            <StatCard
              title="Submissions pending"
              value={data.submissionsPending}
              icon={Clock}
              color={data.submissionsPending > 0 ? 'destructive' : 'default'}
              onClick={() => navigate(data.companyWide ? '/approvals' : '/my-campaigns')}
            />
            <StatCard
              title="Quick Gifts pending"
              value={data.quickGiftsPending}
              icon={Zap}
              color={data.quickGiftsPending > 0 ? 'destructive' : 'default'}
              onClick={() => navigate(data.companyWide ? '/approvals' : '/quick-gift')}
            />
            <StatCard
              title="Quick Gifts this month"
              value={data.quickGiftsThisMonth}
              icon={CalendarDays}
              onClick={() => setDrilldown({ dimension: 'quickGiftsThisMonth', value: '' })}
            />
          </div>

          <SectionCard title="Weekly activity" description="Last 12 weeks. Click a point to see its records.">
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
          </SectionCard>

          <Section title="Where things stand">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard title="Orders by source">
                <DonutChart data={breakdowns.source} emptyText="No orders yet." onSelect={(key) => setDrilldown({ dimension: 'orderSource', value: key })} />
              </SectionCard>
              <SectionCard title="Quick Gift status">
                <DonutChart
                  data={breakdowns.quickGift}
                  emptyText="No Quick Gift requests yet."
                  onSelect={(key) => setDrilldown({ dimension: 'quickGiftStatus', value: key })}
                />
              </SectionCard>
              <SectionCard title="Campaign submission status">
                <DonutChart
                  data={breakdowns.submission}
                  emptyText="No submissions yet."
                  onSelect={(key) => setDrilldown({ dimension: 'submissionStatus', value: key })}
                />
              </SectionCard>
            </div>
          </Section>

          <Section title="What's performing">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard title="Top gifts">
                <MiniBarChart
                  data={data.topGifts.map((g) => ({ label: g.giftName, value: g.orderCount, color: SOURCE_COLORS.CAMPAIGN }))}
                  seriesName="Orders"
                  emptyText="No orders yet."
                  onSelect={(bar) => setDrilldown({ dimension: 'topGift', value: bar.label })}
                />
              </SectionCard>
              <SectionCard title="Top campaigns">
                <MiniBarChart
                  data={data.topCampaigns.map((c) => ({ label: c.campaignName, value: c.orderCount, color: SOURCE_COLORS.QUICK_GIFT }))}
                  seriesName="Orders"
                  emptyText="No campaign orders yet."
                  onSelect={(bar) => {
                    const campaign = data.topCampaigns.find((c) => c.campaignName === bar.label)
                    if (campaign) navigate(`/campaigns/${campaign.campaignId}`)
                  }}
                />
              </SectionCard>
              <SectionCard title={data.companyWide ? 'Top departments' : 'Your department'}>
                <MiniBarChart
                  data={data.topDepartments.map((d) => ({ label: d.departmentName, value: d.orderCount, color: '#7c3aed' }))}
                  seriesName="Orders"
                  emptyText="No orders yet."
                  onSelect={(bar) => setDrilldown({ dimension: 'topDepartment', value: bar.label })}
                />
              </SectionCard>
            </div>
          </Section>

          <Section title="What's happening">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RecentCampaignsCard campaigns={data.recentCampaigns} />
              <RecentActivityFeed items={data.recentActivity} onSelectQuickGift={setSelectedQuickGiftId} />
            </div>
          </Section>
        </>
      )}

      <DashboardDrilldownDialog selection={drilldown} onHide={() => setDrilldown(null)} />
      <QuickGiftActivityDialog quickGiftId={selectedQuickGiftId} onHide={() => setSelectedQuickGiftId(null)} />
    </div>
  )
}
