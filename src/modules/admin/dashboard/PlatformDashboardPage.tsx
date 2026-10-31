import { Building2, Gift, Package, Truck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { MiniBarChart } from '@/components/charts/mini-bar-chart'
import { SectionCard } from '@/components/section-card'
import { StatCard } from '@/components/stat-card'
import { usePlatformDashboard } from '@/hooks/usePlatformDashboard'
import { humanize } from '@/lib/format'
import { statusColor } from '@/lib/statusColors'

/** Wrappzo staff's overview: what the platform serves across every company, and where its orders stand. */
export function PlatformDashboardPage() {
  const { t } = useTranslation('admin')
  const { data, isLoading } = usePlatformDashboard()

  const pipeline = useMemo(
    () => Object.entries(data?.ordersByStatus ?? {}).map(([status, value]) => ({ label: humanize(status), value, color: statusColor(status) })),
    [data],
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('platformDashboard.title')}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t('platformDashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard title={t('platformDashboard.companies')} value={data?.companies ?? 0} description={t('platformDashboard.companiesActive', { count: data?.activeCompanies ?? 0 })} icon={Building2} color="primary" loading={isLoading} />
        <StatCard title={t('platformDashboard.vendors')} value={data?.vendors ?? 0} description={t('platformDashboard.vendorsActive', { count: data?.activeVendors ?? 0 })} icon={Truck} loading={isLoading} />
        <StatCard title={t('platformDashboard.users')} value={data?.users ?? 0} icon={Users} loading={isLoading} />
        <StatCard title={t('platformDashboard.gifts')} value={data?.gifts ?? 0} description={t('platformDashboard.giftsActive', { count: data?.activeGifts ?? 0 })} icon={Gift} loading={isLoading} />
        <StatCard title={t('platformDashboard.orders')} value={data?.orders ?? 0} icon={Package} color="success" loading={isLoading} />
      </div>

      <SectionCard title={t('platformDashboard.pipeline')}>
        <MiniBarChart data={pipeline} seriesName={t('platformDashboard.ordersSeries')} emptyText={t('platformDashboard.pipelineEmpty')} />
      </SectionCard>
    </div>
  )
}
