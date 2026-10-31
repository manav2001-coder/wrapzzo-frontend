import {
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  Handshake,
  Mail,
  Package,
  Stethoscope,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'

import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/button'
import { WrapzzoLogo } from '@/components/wrapzzo-logo'

const CONTACT_EMAIL = 'hello@wrappzo.com'

/** Icon + translation key + tint, the same tinted-tile language the sign-in hero uses. */
const SOLUTIONS: { key: string; icon: LucideIcon; tone: string }[] = [
  { key: 'employee', icon: Users, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300' },
  { key: 'client', icon: Briefcase, tone: 'text-violet-600 bg-violet-500/10 dark:text-violet-300' },
  { key: 'dealer', icon: Truck, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-300' },
  { key: 'pharma', icon: Stethoscope, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300' },
  { key: 'events', icon: CalendarDays, tone: 'text-rose-600 bg-rose-500/10 dark:text-rose-300' },
  { key: 'welcome', icon: Package, tone: 'text-teal-600 bg-teal-500/10 dark:text-teal-300' },
  { key: 'rewards', icon: Award, tone: 'text-orange-600 bg-orange-500/10 dark:text-orange-300' },
  { key: 'partner', icon: Handshake, tone: 'text-green-600 bg-green-500/10 dark:text-green-300' },
]

const FOOTER_LINKS = ['giftStore', 'quickGifts', 'bulkGifting', 'campaigns'] as const

const GRID =
  '[background-image:linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:44px_44px]'

/** The navy hero band the sign-in screen sits on: gradient, glow and a faint grid. */
function HeroBand({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`hero-gradient relative isolate overflow-hidden text-white ${className ?? ''}`}>
      <div aria-hidden className="hero-glow absolute inset-0 -z-10" />
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 ${GRID} [mask-image:radial-gradient(ellipse_75%_70%_at_50%_45%,black,transparent)]`}
      />
      {children}
    </section>
  )
}

/**
 * The public front door. A signed-in visitor never sees it: they are sent to their own side
 * (ProtectedRoute corrects platform staff vs company users from there).
 */
export function LandingPage() {
  const { t } = useTranslation('public')
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const vendorAccessToken = useAppSelector((state) => state.vendorAuth.accessToken)

  if (accessToken) return <Navigate to="/home" replace />
  if (vendorAccessToken) return <Navigate to="/vendor" replace />

  return (
    <div className="min-h-svh bg-background text-foreground">
      <HeroBand>
        <header className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 pt-6 sm:px-10">
          <WrapzzoLogo height={32} />
          <nav className="flex items-center gap-6">
            <a href="#solutions" className="hidden text-sm font-medium text-white/75 hover:text-white sm:inline">
              {t('landing.nav.solutions')}
            </a>
            <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
              <Link to="/login">{t('landing.nav.login')}</Link>
            </Button>
          </nav>
        </header>

        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-20 pb-28 text-center">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            {t('landing.hero.badge')}
          </p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">{t('landing.hero.title')}</h1>
          <p className="max-w-xl text-balance text-lg text-white/70">{t('landing.hero.body')}</p>
          <Button asChild size="lg" className="mt-2 rounded-full px-7">
            <Link to="/login">
              {t('landing.hero.cta')}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </HeroBand>

      <section id="solutions" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight">{t('landing.solutions.title')}</h2>
          <p className="mt-3 text-muted-foreground">{t('landing.solutions.body')}</p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map(({ key, icon: Icon, tone }) => (
            <li key={key} className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                <Icon className="size-5" />
              </span>
              <h3 className="font-semibold">{t(`landing.solutions.${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`landing.solutions.${key}.description`)}</p>
              <p className="mt-auto border-t pt-3 text-xs text-muted-foreground">{t(`landing.solutions.${key}.caption`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <HeroBand>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.cta.title')}</h2>
          <p className="text-white/70">{t('landing.cta.body')}</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/login">{t('landing.hero.cta')}</Link>
            </Button>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-sm text-white/75 hover:text-white">
              <Mail className="size-4" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </HeroBand>

      <footer className="bg-sidebar pt-14 pb-8 text-white/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <WrapzzoLogo height={26} />
            <p className="max-w-xs text-sm">{t('landing.footer.blurb')}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{t('landing.footer.platform')}</p>
            {FOOTER_LINKS.map((key) => (
              <span key={key} className="text-sm">
                {t(`landing.footer.links.${key}`)}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{t('landing.footer.account')}</p>
            <Link to="/login" className="w-fit text-sm hover:text-white">
              {t('landing.nav.login')}
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="w-fit text-sm hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-6 pt-6 text-xs text-white/40">
          {t('landing.footer.rights', { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  )
}
