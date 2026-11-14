import {
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardList,
  Mail,
  Package,
  Printer,
  Send,
  Stethoscope,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'

import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/button'
import { WrapzzoLogo } from '@/components/wrapzzo-logo'

const CONTACT_EMAIL = 'hello@wrappzo.com'

/** The four steps, in order. */
const STEPS: { key: string; icon: LucideIcon }[] = [
  { key: 'request', icon: Send },
  { key: 'approve', icon: BadgeCheck },
  { key: 'print', icon: Printer },
  { key: 'dispatch', icon: Truck },
]

/** Who does what: each group lists the existing feature blurbs (title + description) for that role. */
const ROLES: { key: string; icon: LucideIcon; tone: string; features: string[] }[] = [
  { key: 'field', icon: Stethoscope, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300', features: ['request', 'doctors', 'tracking'] },
  { key: 'managers', icon: BadgeCheck, tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-300', features: ['approval', 'artwork', 'dashboards'] },
  { key: 'vendors', icon: Package, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-300', features: ['vendors', 'dispatch'] },
]

/** How far along the pretend order in the hero is (the 4th of 6 steps is current). */
const MOCK_CURRENT_STEP = 3

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

/** A small, made-up order card that shows what the product tracks. Decorative, so hidden from screen readers. */
function OrderMock() {
  const { t } = useTranslation('public')
  const steps = t('landing.hero.mock.steps', { returnObjects: true }) as string[]
  return (
    <div aria-hidden className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-5 text-left shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">{t('landing.hero.mock.label')}</p>
        <span className="rounded-full bg-emerald-300/20 px-2.5 py-0.5 text-xs font-medium text-emerald-200">{t('landing.hero.mock.status')}</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10">
          <ClipboardList className="size-5 text-white/80" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {t('landing.hero.mock.order')} · {t('landing.hero.mock.doctor')}
          </p>
          <p className="text-sm text-white/60">{t('landing.hero.mock.detail')}</p>
        </div>
      </div>
      <ol className="mt-5 space-y-3 border-t border-white/10 pt-5">
        {steps.map((label, i) => {
          const done = i < MOCK_CURRENT_STEP
          const current = i === MOCK_CURRENT_STEP
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                  done ? 'border-emerald-300 bg-emerald-300 text-emerald-950' : current ? 'border-emerald-300 ring-4 ring-emerald-300/20' : 'border-white/25'
                }`}
              >
                {done && <Check className="size-3" strokeWidth={3} />}
                {current && <span className="size-2 rounded-full bg-emerald-300" />}
              </span>
              <span className={done ? 'text-white/70' : current ? 'font-semibold text-white' : 'text-white/40'}>{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
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
        <header className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-5 pt-5 sm:px-10 sm:pt-6">
          <WrapzzoLogo height={32} />
          <nav className="flex items-center gap-6">
            <a href="#how-it-works" className="hidden text-sm font-medium text-white/75 hover:text-white sm:inline">
              {t('landing.nav.solutions')}
            </a>
            <Button asChild size="sm" variant="secondary" className="h-10 rounded-full px-5">
              <Link to="/login">{t('landing.nav.login')}</Link>
            </Button>
          </nav>
        </header>

        <div className="mx-auto grid max-w-screen-xl items-center gap-10 px-5 pt-12 pb-16 sm:px-10 sm:pt-16 sm:pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-20">
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              {t('landing.hero.badge')}
            </p>
            <h1 className="text-balance text-[2rem] leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{t('landing.hero.title')}</h1>
            <p className="max-w-xl text-balance text-base text-white/70 sm:text-lg">{t('landing.hero.body')}</p>
            <div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 rounded-full px-7">
                <Link to="/login">
                  {t('landing.hero.cta')}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-white hover:bg-white/10 hover:text-white">
                <a href="#how-it-works">{t('landing.hero.secondary')}</a>
              </Button>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <OrderMock />
          </div>
        </div>
      </HeroBand>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-4 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.steps.title')}</h2>
          <p className="mt-3 text-muted-foreground">{t('landing.steps.body')}</p>
        </div>
        <ol className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <li key={key} className="relative flex gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-col sm:gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="font-semibold">{t(`landing.steps.items.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`landing.steps.items.${key}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="roles" className="scroll-mt-4 border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <h2 className="mx-auto max-w-2xl text-balance text-center text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.roles.title')}</h2>
          <div className="mt-10 grid gap-5 sm:mt-12 lg:grid-cols-3">
            {ROLES.map(({ key, icon: Icon, tone, features }) => (
              <div key={key} className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{t(`landing.roles.${key}`)}</h3>
                </div>
                <ul className="flex flex-col gap-4 border-t pt-4">
                  {features.map((f) => (
                    <li key={f}>
                      <p className="text-sm font-medium">{t(`landing.solutions.${f}.title`)}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{t(`landing.solutions.${f}.description`)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HeroBand>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-5 py-16 text-center sm:py-24">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl">{t('landing.cta.title')}</h2>
          <p className="text-white/70">{t('landing.cta.body')}</p>
          <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-6">
            <Button asChild size="lg" className="h-12 w-full rounded-full px-7 sm:w-auto">
              <Link to="/login">{t('landing.hero.cta')}</Link>
            </Button>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex min-h-11 items-center gap-2 text-sm text-white/75 hover:text-white">
              <Mail className="size-4" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </HeroBand>

      <footer className="bg-sidebar pt-12 pb-8 text-white/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-3 sm:gap-10 sm:px-6">
          <div className="flex flex-col gap-3">
            <WrapzzoLogo height={26} />
            <p className="max-w-xs text-sm">{t('landing.footer.blurb')}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">{t('landing.footer.platform')}</p>
            <a href="#how-it-works" className="flex min-h-9 w-fit items-center text-sm hover:text-white">
              {t('landing.footer.links.how')}
            </a>
            <a href="#roles" className="flex min-h-9 w-fit items-center text-sm hover:text-white">
              {t('landing.footer.links.roles')}
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">{t('landing.footer.account')}</p>
            <Link to="/login" className="flex min-h-9 w-fit items-center text-sm hover:text-white">
              {t('landing.nav.login')}
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex min-h-9 w-fit items-center text-sm hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-white/10 px-5 pt-6 text-xs text-white/40 sm:px-6">
          {t('landing.footer.rights', { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  )
}
