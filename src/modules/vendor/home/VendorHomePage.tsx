import { format } from 'date-fns'
import { ArrowRight, CheckCircle2, ChevronRight, Eye, Gift as GiftIcon, MessageSquareWarning, PackageCheck, Palette, Plus, Truck, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import type { VendorOrder } from '@/api/vendorOrders'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useVendorGifts } from '@/hooks/useVendorGifts'
import { useMyVendorProfile, useVendorOrders } from '@/hooks/useVendorOrders'
import { formatDate } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { ACTION_STAGES, vendorStageOf, type VendorStage } from '@/lib/vendor-order-stage'
import { VendorStageBadge } from '../orders/VendorStageBadge'

interface QueueStage {
  stage: VendorStage
  icon: LucideIcon
  /** Tailwind classes: the icon chip, and the accent bar when something is waiting. */
  chip: string
  accent: string
  /** Whether the next move is the vendor's (otherwise it waits on someone else). */
  mine: boolean
}

/** The queue in the order work happens: fix, create, wait for the customer, ship, confirm. */
const QUEUE: QueueStage[] = [
  { stage: 'rework', icon: MessageSquareWarning, chip: 'bg-destructive/10 text-destructive', accent: 'bg-destructive', mine: true },
  { stage: 'artwork', icon: Palette, chip: 'bg-warning/15 text-warning', accent: 'bg-warning', mine: true },
  { stage: 'review', icon: Eye, chip: 'bg-primary/10 text-primary', accent: 'bg-primary/50', mine: false },
  { stage: 'ready', icon: PackageCheck, chip: 'bg-success/15 text-success', accent: 'bg-success', mine: true },
  { stage: 'dispatched', icon: Truck, chip: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', accent: 'bg-sky-500', mine: true },
]

function greetingKey(date: Date) {
  const hour = date.getHours()
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
}

function QueueCard({ item, count, loading, onOpen }: { item: QueueStage; count: number; loading: boolean; onOpen: () => void }) {
  const { t } = useTranslation('vendor')
  const waiting = count > 0
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
    >
      <span className={cn('absolute inset-x-0 top-0 h-1 transition-opacity', item.accent, waiting ? 'opacity-100' : 'opacity-0')} />
      <div className="flex items-center justify-between">
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl', waiting ? item.chip : 'bg-muted text-muted-foreground')}>
          <item.icon className="h-4.5 w-4.5" />
        </span>
        {!item.mine && waiting && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{t('home.waitingOnOthers')}</span>}
      </div>
      <div>
        {loading ? <Skeleton className="h-9 w-10" /> : <p className={cn('text-3xl leading-none font-bold tabular-nums', !waiting && 'text-muted-foreground/60')}>{count}</p>}
        <p className="mt-1.5 text-sm font-semibold">{t(`stage.${item.stage}`)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(`home.hint.${item.stage}`)}</p>
      </div>
    </button>
  )
}

function ActionRow({ order, stage }: { order: VendorOrder; stage: VendorStage }) {
  const { t } = useTranslation('vendor')
  const item = QUEUE.find((q) => q.stage === stage)!
  return (
    <li>
      <Link to={`/vendor/orders/${order.id}`} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', item.chip)}>
          <item.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {order.displayId} · {order.giftName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {order.companyName} · {order.recipientName} · {formatDate(order.assignedAt ?? order.createdAt)}
          </p>
          {stage === 'rework' && order.latestDesignComment ? (
            <p className="mt-1 truncate rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive">“{order.latestDesignComment}”</p>
          ) : (
            <p className="mt-0.5 truncate text-xs font-medium text-primary">{t(`home.action.${stage}`)}</p>
          )}
        </div>
        <VendorStageBadge stage={stage} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}

/**
 * The vendor's landing page: a greeting that says how much is waiting, the work queue by
 * stage (each card opens that slice of the orders list), the orders that need the vendor's hand next, and the catalogue.
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

  // Orders that need the vendor's hand, the most urgent stage first and the oldest first within it.
  const toAct = useMemo(
    () =>
      ACTION_STAGES.flatMap((stage) =>
        [...(byStage.get(stage) ?? [])]
          .sort((a, b) => (a.assignedAt ?? a.createdAt).localeCompare(b.assignedAt ?? b.createdAt))
          .map((order) => ({ order, stage })),
      ),
    [byStage],
  )
  const delivered = byStage.get('delivered')?.length ?? 0
  const live = (gifts ?? []).filter((gift) => gift.active).length
  const hidden = (gifts ?? []).length - live
  const now = new Date()

  return (
    <div className="space-y-7 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{format(now, 'EEEE, d MMMM')}</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
              {t(`home.good.${greetingKey(now)}`)}
              {profile?.name ? `, ${profile.name}` : ''}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : toAct.length > 0 ? (
                t('home.heroWaiting', { count: toAct.length })
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t('home.allCaughtUp')}
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <section aria-label={t('home.todo')}>
        <h2 className="mb-3 text-base font-semibold tracking-tight">{t('home.todo')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {QUEUE.map((item) => (
            <QueueCard key={item.stage} item={item} count={byStage.get(item.stage)?.length ?? 0} loading={isLoading} onOpen={() => navigate(`/vendor/orders?stage=${item.stage}`)} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t('home.actionTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('home.actionBody')}</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/vendor/orders">
                {t('home.viewAll')}
                <ArrowRight />
              </Link>
            </Button>
          </div>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : toAct.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold">{t('home.allCaughtUp')}</p>
              <p className="text-xs text-muted-foreground">{t('home.allCaughtUpBody')}</p>
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
              {toAct.slice(0, 6).map(({ order, stage }) => (
                <ActionRow key={order.id} order={order} stage={stage} />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">{t('home.glanceTitle')}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">{t('home.totalOrders')}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{isLoading ? '–' : (orders ?? []).length}</dd>
              </div>
              <div className="rounded-xl bg-success/10 p-3">
                <dt className="text-xs text-muted-foreground">{t('stage.delivered')}</dt>
                <dd className="mt-1 text-2xl font-bold text-success tabular-nums">{isLoading ? '–' : delivered}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <GiftIcon className="h-4 w-4" />
              </span>
              {t('home.catalogueTitle')}
            </h2>
            {giftsLoading ? (
              <Skeleton className="mt-3 h-14 w-full" />
            ) : (gifts ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('home.noGifts')}</p>
            ) : (
              <div className="mt-3 space-y-1 text-sm">
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
          </section>
        </aside>
      </div>
    </div>
  )
}
