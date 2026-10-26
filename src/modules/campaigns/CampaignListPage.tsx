import { Button } from 'primereact/button'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Campaign, CampaignStatus } from '@/api/campaigns'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusDonutChart } from '@/components/StatusDonutChart'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useHasAccess } from '@/hooks/use-permission'
import { humanize } from '@/lib/format'

const PURPOSE_ICON: Record<string, string> = {
  PRODUCT_LAUNCH: 'pi-box',
  EMPLOYEE_RECOGNITION: 'pi-star',
  FESTIVAL: 'pi-sparkles',
  EVENT: 'pi-calendar',
  CONFERENCE: 'pi-users',
  CLIENT_ENGAGEMENT: 'pi-heart',
  HCP_ENGAGEMENT: 'pi-heart-fill',
  DISTRIBUTOR_ENGAGEMENT: 'pi-truck',
  REWARDS: 'pi-gift',
  OTHER: 'pi-megaphone',
}

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
            <i className={`pi ${PURPOSE_ICON[campaign.purpose] ?? 'pi-megaphone'}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-text">{campaign.name}</p>
            <p className="text-xs text-text-muted">{campaign.displayId}</p>
          </div>
        </div>
        <StatusBadge status={campaign.status} label={humanize(campaign.status)} />
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-text-muted">
        <span className="rounded-full bg-surface-muted px-2 py-0.5">{humanize(campaign.purpose)}</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5">{humanize(campaign.recipientCategory)}</span>
        {campaign.gifts.map((gift) => (
          <span key={gift.id} className="rounded-full bg-surface-muted px-2 py-0.5">
            {gift.name}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        <div>
          <p className="text-lg font-bold tracking-tight text-text">{campaign.submissionCount}</p>
          <p className="text-[11px] text-text-muted">Submitted</p>
        </div>
        <div>
          <p className={`text-lg font-bold tracking-tight ${campaign.pendingApprovalCount > 0 ? 'text-amber-500' : 'text-text'}`}>
            {campaign.pendingApprovalCount}
          </p>
          <p className="text-[11px] text-text-muted">Pending</p>
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-emerald-500">{campaign.orderCount}</p>
          <p className="text-[11px] text-text-muted">Orders</p>
        </div>
      </div>
    </button>
  )
}

export function CampaignListPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL')

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { DRAFT: 0, ACTIVE: 0, CLOSED: 0 }
    campaigns?.forEach((c) => (counts[c.status] = (counts[c.status] ?? 0) + 1))
    return counts
  }, [campaigns])

  const totals = useMemo(
    () =>
      (campaigns ?? []).reduce(
        (acc, c) => ({
          submissions: acc.submissions + c.submissionCount,
          pending: acc.pending + c.pendingApprovalCount,
          orders: acc.orders + c.orderCount,
        }),
        { submissions: 0, pending: 0, orders: 0 },
      ),
    [campaigns],
  )

  const filtered = useMemo(() => {
    if (!campaigns) return []
    if (statusFilter === 'ALL') return campaigns
    return campaigns.filter((c) => c.status === statusFilter)
  }, [campaigns, statusFilter])

  const canManage = useHasAccess('campaign.manage')
  const newCampaignAction = canManage ? (
    <Button label="New campaign" icon="pi pi-plus" onClick={() => navigate('/campaigns/new')} />
  ) : undefined

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Coordinate team-driven gifting initiatives: create a campaign, assign your team, and approved recipients become orders."
        actions={campaigns && campaigns.length > 0 ? newCampaignAction : undefined}
      />

      {!isLoading && campaigns?.length === 0 ? (
        <EmptyState
          icon="pi-megaphone"
          title="No campaigns yet"
          description={
            canManage
              ? 'Start your first campaign: pick a gift, choose your team, and let approved submissions flow straight into orders.'
              : "You'll see campaigns here once your team starts one you're part of."
          }
          action={newCampaignAction}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total campaigns" value={campaigns?.length ?? 0} icon="pi-megaphone" />
            <StatCard label="Active now" value={statusCounts.ACTIVE} icon="pi-play" accent="success" />
            <StatCard label="Submission Approvals Pending" value={totals.pending} icon="pi-clock" accent="warning" />
            <StatCard label="Orders generated" value={totals.orders} icon="pi-shopping-bag" accent="accent" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-1">
              <p className="mb-2 text-sm font-medium text-text">Campaigns by status</p>
              <StatusDonutChart counts={statusCounts} />
            </div>
            <div className="flex flex-col justify-center gap-3 rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
              <p className="text-sm font-medium text-text">Funnel across all campaigns</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
                      style={{ width: totals.submissions > 0 ? `${Math.min(100, (totals.orders / totals.submissions) * 100)}%` : '0%' }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="flex flex-col items-start">
                      <span className="text-lg font-bold tracking-tight text-text">{totals.submissions}</span>
                      <span className="text-xs text-text-muted">submitted</span>
                    </span>
                    <span className="flex flex-col items-center">
                      <span className="text-lg font-bold tracking-tight text-amber-500">{totals.pending}</span>
                      <span className="text-xs text-text-muted">awaiting approval</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="text-lg font-bold tracking-tight text-emerald-500">{totals.orders}</span>
                      <span className="text-xs text-text-muted">became orders</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 inline-flex w-fit gap-1 rounded-xl border border-border bg-surface p-1">
            {(['ALL', 'DRAFT', 'ACTIVE', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg border-none px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-accent text-white' : 'bg-transparent text-text-muted hover:text-text'
                }`}
              >
                {s === 'ALL' ? 'All' : humanize(s)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="pi-search" title="No campaigns match this filter" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} onClick={() => navigate(`/campaigns/${campaign.id}`)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
