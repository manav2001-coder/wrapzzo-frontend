import { format } from 'date-fns'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { TrendChart } from '@/components/charts/TrendChart'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { useDashboard } from '@/hooks/useDashboard'
import { humanize } from '@/lib/format'
import { statusColor } from '@/lib/statusColors'
import { DashboardDrilldownDialog, type DrilldownSelection } from './DashboardDrilldownDialog'
import { HeroSpendCard } from './HeroSpendCard'
import { PipelineFlow } from './PipelineFlow'
import { SectionHeader } from './SectionHeader'

const SOURCE_LABELS: Record<string, string> = { CAMPAIGN: 'Campaign', QUICK_GIFT: 'Quick Gift', BULK_GIFT: 'Bulk Gifting' }
const SOURCE_COLORS: Record<string, string> = { CAMPAIGN: '#6366f1', QUICK_GIFT: '#f59e0b', BULK_GIFT: '#0d9488' }

// bg-transparent explicitly, not just omitted -- there's no Tailwind preflight in this app
// (see index.css), so a plain <button> with no background utility falls back to PrimeReact's
// own default button chrome (a solid gray fill) instead of staying invisible around the card.
const STAT_BUTTON_CLASS = 'w-full rounded-xl border-none bg-transparent p-0 text-left transition-transform hover:-translate-y-0.5'

export function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const navigate = useNavigate()
  const [drilldown, setDrilldown] = useState<DrilldownSelection>(null)

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
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

  const sourceSlices = Object.entries(data.orderSourceBreakdown).map(([key, value]) => ({
    key,
    name: SOURCE_LABELS[key] ?? humanize(key),
    value,
    color: SOURCE_COLORS[key] ?? '#94a3b8',
  }))
  const quickGiftSlices = Object.entries(data.quickGiftStatusBreakdown).map(([key, value]) => ({
    key,
    name: humanize(key),
    value,
    color: statusColor(key),
  }))
  const submissionSlices = Object.entries(data.submissionStatusBreakdown).map(([key, value]) => ({
    key,
    name: humanize(key),
    value,
    color: key === 'PENDING' ? statusColor('SUBMITTED') : statusColor(key),
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          data.companyWide
            ? `Everything happening across ${data.companyName} — campaigns, orders, and Quick Gift requests, in one place.`
            : 'Your campaigns, orders, and Quick Gift requests, in one place.'
        }
      />

      {!hasAnyActivity ? (
        <EmptyState
          icon="pi-chart-bar"
          title="Nothing to show yet"
          description={
            data.companyWide
              ? 'Once your team starts campaigns and Quick Gift requests, this dashboard fills in automatically.'
              : "Once you're part of a campaign or send a Quick Gift, they'll show up here."
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HeroSpendCard amount={data.monthlySpend} />
            </div>
            <div className="lg:col-span-7">
              <PipelineFlow
                inProgress={data.giftsInProgress}
                dispatched={data.dispatched}
                delivered={data.delivered}
                onSelectStage={() => navigate('/orders')}
              />
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button type="button" onClick={() => navigate(data.companyWide ? '/campaigns' : '/my-campaigns')} className={STAT_BUTTON_CLASS}>
              <StatCard label="Campaigns running" value={data.campaignsRunning} icon="pi-megaphone" />
            </button>
            <button type="button" onClick={() => navigate(data.companyWide ? '/approvals' : '/my-campaigns')} className={STAT_BUTTON_CLASS}>
              <StatCard
                label="Submission approvals pending"
                value={data.submissionsPending}
                icon="pi-clock"
                accent={data.submissionsPending > 0 ? 'danger' : 'accent'}
                urgent={data.submissionsPending > 0}
              />
            </button>
            <button type="button" onClick={() => navigate(data.companyWide ? '/approvals' : '/quick-gift')} className={STAT_BUTTON_CLASS}>
              <StatCard
                label="Quick Gift approvals pending"
                value={data.quickGiftsPending}
                icon="pi-bolt"
                accent={data.quickGiftsPending > 0 ? 'danger' : 'accent'}
                urgent={data.quickGiftsPending > 0}
              />
            </button>
            <button type="button" onClick={() => navigate('/quick-gift')} className={STAT_BUTTON_CLASS}>
              <StatCard label="Quick Gifts this month" value={data.quickGiftsThisMonth} icon="pi-calendar" />
            </button>
          </div>

          <div className="mb-8">
            <SectionHeader eyebrow="Activity" title="Weekly activity — last 12 weeks" />
            <div className="rounded-2xl border border-border bg-surface p-5">
              <TrendChart
                categories={data.activityTrend.map((p) => p.weekLabel)}
                series={[
                  { key: 'CAMPAIGN', name: 'Campaign submissions', data: data.activityTrend.map((p) => p.campaignSubmissions), color: SOURCE_COLORS.CAMPAIGN },
                  { key: 'QUICK_GIFT', name: 'Quick Gift requests', data: data.activityTrend.map((p) => p.quickGiftRequests), color: SOURCE_COLORS.QUICK_GIFT },
                ]}
                onSelect={(index, seriesKey) => {
                  const point = data.activityTrend[index]
                  if (point) setDrilldown({ dimension: 'week', value: `${point.weekStart}:${seriesKey}` })
                }}
              />
            </div>
          </div>

          <div className="mb-8">
            <SectionHeader eyebrow="Breakdown" title="Where things stand" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="mb-2 text-sm font-medium text-text">Orders by source</p>
                <DonutChart
                  slices={sourceSlices}
                  empty="No orders yet."
                  onSelect={(key) => setDrilldown({ dimension: 'orderSource', value: key })}
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="mb-2 text-sm font-medium text-text">Quick Gift status</p>
                <DonutChart
                  slices={quickGiftSlices}
                  empty="No Quick Gift requests yet."
                  onSelect={(key) => setDrilldown({ dimension: 'quickGiftStatus', value: key })}
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="mb-2 text-sm font-medium text-text">Campaign submission status</p>
                <DonutChart
                  slices={submissionSlices}
                  empty="No submissions yet."
                  onSelect={(key) => setDrilldown({ dimension: 'submissionStatus', value: key })}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <SectionHeader eyebrow="Rankings" title="What's performing" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="mb-2 text-sm font-medium text-text">Top gifts</p>
                <BarChart
                  rows={data.topGifts.map((g) => ({ label: g.giftName, value: g.orderCount }))}
                  color={SOURCE_COLORS.CAMPAIGN}
                  empty="No orders yet."
                  onSelect={(row) => setDrilldown({ dimension: 'topGift', value: row.label })}
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="mb-2 text-sm font-medium text-text">Top campaigns</p>
                <BarChart
                  rows={data.topCampaigns.map((c) => ({ label: c.campaignName, value: c.orderCount, to: `/campaigns/${c.campaignId}` }))}
                  color={SOURCE_COLORS.QUICK_GIFT}
                  empty="No campaign orders yet."
                  onSelect={(row) => row.to && navigate(row.to)}
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="mb-2 text-sm font-medium text-text">{data.companyWide ? 'Top departments' : 'Your department'}</p>
                <BarChart
                  rows={data.topDepartments.map((d) => ({ label: d.departmentName, value: d.orderCount }))}
                  color="#7c3aed"
                  empty="No orders yet."
                  onSelect={(row) => setDrilldown({ dimension: 'topDepartment', value: row.label })}
                />
              </div>
            </div>
          </div>

          <div>
            <SectionHeader eyebrow="Recent" title="What's happening" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex h-[380px] flex-col rounded-2xl border border-border bg-surface p-5">
                <p className="mb-3 shrink-0 text-sm font-medium text-text">Recent campaigns</p>
                {data.recentCampaigns.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-center text-sm text-text-muted">No campaigns yet.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-text-muted">
                          <th className="px-2 py-2 text-left font-medium">Campaign</th>
                          <th className="px-2 py-2 text-left font-medium">Status</th>
                          <th className="px-2 py-2 text-left font-medium">Fields</th>
                          <th className="px-2 py-2 text-left font-medium">Deadline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentCampaigns.map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => navigate(`/campaigns/${c.id}`)}
                            className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-muted"
                          >
                            <td className="px-2 py-2">
                              <span className="font-medium text-text">{c.name}</span>
                              <p className="text-xs text-text-muted">{c.displayId} · {c.ownerName}</p>
                            </td>
                            <td className="px-2 py-2">
                              <StatusBadge status={c.status} label={humanize(c.status)} />
                            </td>
                            <td className="px-2 py-2 text-text-muted">{c.fieldCount}</td>
                            <td className="px-2 py-2 whitespace-nowrap text-text-muted">
                              {c.submissionDeadline ? format(new Date(c.submissionDeadline), 'dd MMM yyyy') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex h-[380px] flex-col rounded-2xl border border-border bg-surface p-5">
                <p className="mb-3 shrink-0 text-sm font-medium text-text">Recent activity</p>
                {data.recentActivity.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-center text-sm text-text-muted">Nothing new.</p>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                    {data.recentActivity.map((item, i) => {
                      const row = (
                        <>
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <p className="text-text">
                            <span className="font-medium">{item.actorName}</span> {item.verb} <span className="font-medium">{item.subject}</span>
                            <span className="ml-1.5 text-xs text-text-muted">{format(new Date(item.at), 'dd MMM, h:mm a')}</span>
                          </p>
                        </>
                      )
                      return item.campaignId ? (
                        <Link
                          key={i}
                          to={`/campaigns/${item.campaignId}`}
                          className="-mx-1 flex items-start gap-2.5 rounded-lg px-1 py-0.5 text-sm hover:bg-surface-muted"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div key={i} className="flex items-start gap-2.5 text-sm">
                          {row}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <DashboardDrilldownDialog selection={drilldown} onHide={() => setDrilldown(null)} />
    </div>
  )
}
