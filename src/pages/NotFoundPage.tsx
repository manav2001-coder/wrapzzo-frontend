import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'

/**
 * The catch-all route. "Home" is `/`, not a signed-in page: the landing page already forwards a
 * signed-in user to their own side, and a signed-out one belongs there anyway.
 */
export function NotFoundPage() {
  const { t } = useTranslation('public')
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-6xl font-extrabold tracking-tight text-primary">404</span>
        <h1 className="text-lg font-semibold">{t('notFound.title')}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('notFound.body')}</p>
        <Button asChild className="mt-2">
          <Link to="/">{t('notFound.home')}</Link>
        </Button>
      </div>
    </AuthShell>
  )
}
