import { ArrowRight, CheckCircle2, Eye, Gift as GiftIcon, MessageSquareWarning, Palette, Plus, Truck, PackageCheck, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import type { VendorOrder } from '@/api/vendorOrders'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { StatCard } from '@/components/stat-card'
import type { StatColor } from '@/components/stat-color'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useVendorGifts } from '@/hooks/useVendorGifts'
import { useMyVendorProfile, useVendorOrders } from '@/hooks/useVendorOrders'
import { formatDate } from '@/lib/datetime'
import { vendorStageOf, type VendorStage } from '@/lib/vendor-order-stage'
import { VendorStageBadge } from '../orders/VendorStageBadge'

/** The queue tiles, in the order work should happen: fix, create, wait, ship, confirm. */
const QUEUE: { stage: VendorStage; icon: LucideIcon; color: StatColor }[] = [
  { stage: 'rework', icon: MessageSquareWarning, color: 'destructive' },
  { stage: 'artwork', icon: Palette, color: 'warning' },
  { stage: 'review', icon: Eye, color: 'primary' },
  { stage: 'ready', icon: PackageCheck, color: 'success' },
  { stage: 'dispatched', icon: Truck, color: 'primary' },
]

function OrderLine({ order }: { order: VendorOrder }) {
  return (
    <li>
      <Link
        to={`/vendor/orders/${order.id}`}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {order.displayId} · {order.giftName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {order.companyName} · {order.recipientName} · {formatDate(order.assignedAt ?? order.createdAt)}
          </p>
        </div>
        <VendorStageBadge stage={vendorStageOf(order)} />
      </Link>
    </li>
  )
}

/**
 * The vendor's landing page: their work queue by stage (each tile opens that slice of the orders
 * list), the proofs customers sent back, the latest orders, and the state of their catalogue.
 */
export function VendorHomePage() {
  const { t } = useTranslation('vendor')
  const navigate = useNavigate()
  const { data: profile } = useMyVendorProfile()
  const { data: orders, isLoading } = useVendorOrders()
  const { data: gifts, isLoading: giftsLoading } = useVendorGifts()

  const byStage = useMemo(() => {
    const map = new Map<VendorStage, VendorOrder[]>()
    for (const order of orders ?? []) {
      const stage = vendorStageOf(order)
      map.set(stage, [...(map.get(stage) ?? []), order])
    }
    return map
  }, [orders])

  const rework = byStage.get('rework') ?? []
  const waitingOnMe = QUEUE.filter((q) => q.stage !== 'review').reduce((sum, q) => sum + (byStage.get(q.stage)?.length ?? 0), 0)
  const recent = [...(orders ?? [])]
    .sort((a, b) => (b.assignedAt ?? b.createdAt).localeCompare(a.assignedAt ?? a.createdAt))
    .slice(0, 6)
  const live = (gifts ?? []).filter((gift) => gift.active).length
  const hidden = (gifts ?? []).length - live

  return (
    <div className="space-y-5 pb-6">
      <MasterPageHeader
        title={profile?.name ? t('home.greeting', { name: profile.name }) : t('home.greetingFallback')}
        description={t('home.subtitle')}
      />

      <section aria-label={t('home.todo')}>
        <h2 className="mb-2 text-sm font-semibold">{t('home.todo')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {QUEUE.map(({ stage, icon, color }) => (
            <StatCard
              key={stage}
              title={t(`stage.${stage}`)}
              value={byStage.get(stage)?.length ?? 0}
              icon={icon}
              color={(byStage.get(stage)?.length ?? 0) > 0 ? color : 'default'}
              loading={isLoading}
              onClick={() => navigate(`/vendor/orders?stage=${stage}`)}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {rework.length > 0 && (
            <SectionCard
              title={
                <span className="inline-flex items-center gap-2 text-destructive">
                  <MessageSquareWarning className="h-4 w-4" />
                  {t('home.reworkTitle')}
                </span>
              }
              description={t('home.reworkBody')}
            >
              <ul className="space-y-2">
                {rework.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/vendor/orders/${order.id}`}
                      className="block rounded-md border border-destructive/20 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                    >
                      <p className="text-sm font-medium">
                        {order.displayId} · {order.giftName} · {order.recipientName}
                      </p>
                      {order.latestDesignComment && <p className="mt-0.5 text-sm text-muted-foreground">“{order.latestDesignComment}”</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard
            title={t('home.recentTitle')}
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/vendor/orders">
                  {t('home.viewAll')}
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : waitingOnMe === 0 && recent.length === 0 ? (
              <EmptyState variant="plain" icon={CheckCircle2} title={t('home.allCaughtUp')} description={t('home.allCaughtUpBody')} />
            ) : (
              <>
                {waitingOnMe === 0 && (
                  <p className="mb-2 flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('home.allCaughtUp')}
                  </p>
                )}
                <ul className="divide-y">
                  {recent.map((order) => (
                    <OrderLine key={order.id} order={order} />
                  ))}
                </ul>
              </>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <GiftIcon className="h-4 w-4 text-primary" />
              {t('home.catalogueTitle')}
            </span>
          }
        >
          {giftsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (gifts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('home.noGifts')}</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">{t('home.live', { count: live })}</p>
              {hidden > 0 && <p className="text-muted-foreground">{t('home.hidden', { count: hidden })}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/vendor/gifts/new">
                <Plus />
                {t('home.addGift')}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/vendor/gifts">{t('home.manageGifts')}</Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
