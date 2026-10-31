import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from '@/app/hooks'
import { flattenNavItems } from '@/components/nav/nav-types'
import { useNav } from '@/components/nav/use-nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useCurrentLocale } from '@/hooks/use-current-locale'
import { useUserTimezone } from '@/hooks/use-user-timezone'
import { formatDateTime, tzAbbreviation } from '@/lib/datetime'
import { LOCALE_LABELS } from '@/lib/i18n'

/**
 * Wrappzo staff's landing page, MobixFL's General -> Dashboard: who you are signed in as, then the
 * masters you can actually reach. It reads no data of its own -- the nav already filters by access.
 */
export function PlatformDashboardPage() {
  const { t } = useTranslation()
  const email = useAppSelector((state) => state.auth.user?.email ?? null)
  const { data: user, isLoading } = useCurrentUser()
  const locale = useCurrentLocale()
  const timeZone = useUserTimezone()
  const nav = useNav()

  const destinations = flattenNavItems(nav).filter((item) => item.url?.startsWith('/admin/') && item.id !== 'platform-dashboard')

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{email ? `${t('app.name')} · ${email}` : t('app.name')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.localisation')}</CardTitle>
          <CardDescription>
            {formatDateTime(new Date(), { timeZone })} ({tzAbbreviation(timeZone)})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !user ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs">{(email ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="min-w-0 truncate text-sm font-medium">{email}</p>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {user.companyName && <Badge variant="outline">{user.companyName}</Badge>}
                <Badge variant="outline">{LOCALE_LABELS[locale]}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {destinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('nav.masters')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {destinations.map((item) => (
                <Link
                  key={item.id}
                  to={item.url!}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{item.title}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
