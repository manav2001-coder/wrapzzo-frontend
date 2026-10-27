import {
  Award,
  Box,
  CalendarDays,
  Clock,
  Gift,
  Heart,
  HeartPulse,
  Megaphone,
  PlayCircle,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Campaign, CampaignStatus } from '@/api/campaigns'
import { AppTabs } from '@/components/app-tabs'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useHasAccess } from '@/hooks/use-permission'
import { humanize } from '@/lib/format'
import { CampaignStatusBadge } from './campaign-status'

const PURPOSE_ICON: Record<string, LucideIcon> = {
  PRODUCT_LAUNCH: Box,
  EMPLOYEE_RECOGNITION: Award,
  FESTIVAL: Sparkles,
  EVENT: CalendarDays,
  CONFERENCE: Users,
  CLIENT_ENGAGEMENT: Heart,
  HCP_ENGAGEMENT: HeartPulse,
  DISTRIBUTOR_ENGAGEMENT: Truck,
  REWARDS: Gift,
  OTHER: Megaphone,
}

const STATUS_TABS: (CampaignStatus | 'ALL')[] = ['ALL', 'DRAFT', 'ACTIVE', 'CLOSED']

function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: () => void }) {
  const Icon = PURPOSE_ICON[campaign.purpose] ?? Megaphone
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{campaign.name}</h3>
            <p className="text-xs text-muted-foreground">{campaign.displayId}</p>
          </div>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary-soft">{humanize(campaign.purpose)}</Badge>
        <Badge variant="secondary-soft">{humanize(campaign.recipientCategory)}</Badge>
        {campaign.gifts.map((gift) => (
          <Badge key={gift.id} variant="outline">
            {gift.name}
          </Badge>
        ))}
      </div>

      <dl className="mt-1 grid grid-cols-3 gap-2 border-t pt-3 text-center">
        <div>
          <dd className="text-lg font-bold">{campaign.submissionCount}</dd>
          <dt className="text-[11px] text-muted-foreground">Submitted</dt>
        </div>
        <div>
          <dd className={campaign.pendingApprovalCount > 0 ? 'text-lg font-bold text-warning' : 'text-lg font-bold'}>
            {campaign.pendingApprovalCount}
          </dd>
          <dt className="text-[11px] text-muted-foreground">Pending</dt>
        </div>
        <div>
          <dd className="text-lg font-bold text-success">{campaign.orderCount}</dd>
          <dt className="text-[11px] text-muted-foreground">Orders</dt>
        </div>
      </dl>
    </button>
  )
}

/** The company's campaigns: totals up top, a status filter, and a card per campaign. */
export function CampaignListPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const navigate = useNavigate()
  const canManage = useHasAccess('campaign.manage')
  const [status, setStatus] = useState<CampaignStatus | 'ALL'>('ALL')

  const list = useMemo(() => campaigns ?? [], [campaigns])
  const totals = useMemo(
    () =>
      list.reduce(
        (acc, c) => ({ pending: acc.pending + c.pendingApprovalCount, orders: acc.orders + c.orderCount }),
        { pending: 0, orders: 0 },
      ),
    [list],
  )
  const countOf = (s: CampaignStatus) => list.filter((c) => c.status === s).length
  const visible = status === 'ALL' ? list : list.filter((c) => c.status === status)

  return (
    <div className="space-y-4">
      <MasterPageHeader
        title="Campaigns"
        description="Coordinate team-driven gifting: create a campaign, choose who submits recipients, and approved recipients become orders."
        createLabel="New campaign"
        createPermission="campaign.manage"
        onCreate={() => navigate('/campaigns/new')}
      />

      {!isLoading && list.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description={
            canManage
              ? 'Start your first campaign: pick a gift, choose your team, and approved submissions flow straight into orders.'
              : "You'll see campaigns here once your team starts one you're part of."
          }
          action={canManage ? { label: 'New campaign', onClick: () => navigate('/campaigns/new') } : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Total campaigns" value={list.length} icon={Megaphone} loading={isLoading} />
            <StatCard title="Active now" value={countOf('ACTIVE')} icon={PlayCircle} color="success" loading={isLoading} />
            <StatCard title="Submissions pending" value={totals.pending} icon={Clock} color="warning" loading={isLoading} />
            <StatCard title="Orders generated" value={totals.orders} icon={ShoppingBag} color="primary" loading={isLoading} />
          </div>

          <AppTabs
            value={status}
            onValueChange={(value) => setStatus(value as CampaignStatus | 'ALL')}
            tabs={STATUS_TABS.map((s) => ({
              value: s,
              label: s === 'ALL' ? 'All' : humanize(s),
              badge: (s === 'ALL' ? list.length : countOf(s)) || undefined,
            }))}
          />

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={Megaphone} title="No campaigns match this filter" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} onOpen={() => navigate(`/campaigns/${campaign.id}`)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
