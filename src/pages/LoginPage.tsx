import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  BadgeCheck,
  Contact,
  Loader2,
  Megaphone,
  Palette,
  ShoppingBag,
  Store,
  Truck,
  Zap,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { login } from '@/api/auth'
import { vendorLogin } from '@/api/vendorAuth'
import { useAppDispatch } from '@/app/hooks'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { WrapzzoLogo } from '@/components/wrapzzo-logo'
import { setCredentials } from '@/features/auth/authSlice'
import { setVendorCredentials } from '@/features/vendorAuth/vendorAuthSlice'
import { ApiError } from '@/lib/axiosClient'

/** Icon + translation key + accent, as on MobixFL's sign-in: eight tinted pills, not grey rows. */
const FEATURES = [
  { icon: Store, key: 'giftStore', tone: 'text-emerald-300 bg-emerald-400/10' },
  { icon: Zap, key: 'quickGift', tone: 'text-emerald-300 bg-emerald-400/10' },
  { icon: Megaphone, key: 'campaigns', tone: 'text-violet-300 bg-violet-400/10' },
  { icon: Contact, key: 'recipients', tone: 'text-amber-300 bg-amber-400/10' },
  { icon: BadgeCheck, key: 'approvals', tone: 'text-teal-300 bg-teal-400/10' },
  { icon: Palette, key: 'artwork', tone: 'text-rose-300 bg-rose-400/10' },
  { icon: Truck, key: 'vendors', tone: 'text-lime-300 bg-lime-400/10' },
  { icon: ShoppingBag, key: 'tracking', tone: 'text-green-300 bg-green-400/10' },
] as const

/** Inputs on the frosted navy card. */
const INPUT_CLASS = 'h-10 border-white/20 bg-white/[0.07] text-sm text-white placeholder:text-white/30'

type LoginFormValues = { email: string; password: string }

export function LoginPage() {
  const { t } = useTranslation('auth')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)

  const schema = z.object({
    email: z.string().min(1, t('login.emailRequired')).email(t('login.emailInvalid')),
    password: z.string().min(1, t('login.passwordRequired')),
  })
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const locationState = location.state as { passwordSetUp?: boolean } | null
  const passwordSetUp = locationState?.passwordSetUp ?? false

  function lockedMessage(error: ApiError): string {
    const lockedUntil = (error.data as { lockedUntil?: string } | undefined)?.lockedUntil
    return lockedUntil
      ? t('login.locked', { time: new Date(lockedUntil).toLocaleTimeString() })
      : t('login.lockedNoTime')
  }

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null)
    try {
      const tokens = await login(values.email, values.password)
      dispatch(setCredentials({ ...tokens, email: values.email, rememberMe }))
      // Always the first menu of the user's own sidebar -- never the page they were bounced from.
      navigate('/home', { replace: true })
      return
    } catch (userError) {
      if (userError instanceof ApiError && userError.status === 423) {
        setSubmitError(lockedMessage(userError))
        return
      }
    }
    // Not a platform/company user: this same form is also the vendor portal's way in, so try that
    // identity before giving up.
    try {
      const tokens = await vendorLogin(values.email, values.password)
      dispatch(setVendorCredentials({ ...tokens, email: values.email, rememberMe }))
      navigate('/vendor', { replace: true })
    } catch (vendorError) {
      setSubmitError(
        vendorError instanceof ApiError && vendorError.status === 423 ? lockedMessage(vendorError) : t('login.failed'),
      )
    }
  }

  const words = [t('hero.words.choose'), t('hero.words.send'), t('hero.words.track')]

  return (
    <div className="hero-gradient relative isolate min-h-svh overflow-hidden text-white">
      {/* MobixFL's sign-in floats over its film; Wrappzo has none, so the hero's own glow and
          blueprint grid carry the backdrop. */}
      <div aria-hidden className="hero-glow absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background-image:linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_75%_70%_at_50%_45%,black,transparent)]"
      />

      <div className="relative flex min-h-svh flex-col">
        <header className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 pt-6 sm:px-10">
          <Link to="/" className="w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            <WrapzzoLogo height={40} />
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/75 backdrop-blur transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:inline-flex"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            {t('login.backToSite')}
          </Link>
        </header>

        <main className="mx-auto flex w-full max-w-screen-xl flex-1 items-center gap-12 px-6 py-8 [justify-content:safe_center] sm:px-10 lg:justify-between">
          {/* The brand. Large screens only: on a phone the card is the page. */}
          <section className="hidden max-w-2xl flex-1 lg:block">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <span className="relative flex size-2">
                <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
              </span>
              {t('hero.eyebrow')}
            </p>

            <p className="mt-6 flex items-baseline gap-x-[0.3em] whitespace-nowrap text-[clamp(2.5rem,4.2vw,3.75rem)] font-extrabold leading-[0.95] tracking-[-0.045em] [text-shadow:0_2px_30px_rgb(5_13_26/0.6)]">
              {words.map((word, index) => (
                <Fragment key={word}>
                  {index > 0 && (
                    <span aria-hidden className="text-teal-300">
                      ·
                    </span>
                  )}
                  <span>{word}</span>
                </Fragment>
              ))}
            </p>
            <p className="mt-2 bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-[clamp(1.5rem,2.4vw,2.25rem)] font-bold leading-tight tracking-[-0.03em] text-transparent">
              {t('hero.byline')}
            </p>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">{t('hero.headline')}</p>

            <ul className="mt-8 flex max-w-lg flex-wrap gap-2">
              {FEATURES.map((feature) => (
                <li
                  key={feature.key}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-[#050d1a]/40 py-1 pl-1 pr-3 text-xs font-medium text-white/85 backdrop-blur-md"
                >
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${feature.tone}`}>
                    <feature.icon className="size-3.5" />
                  </span>
                  {t(`hero.features.${feature.key}`)}
                </li>
              ))}
            </ul>
          </section>

          {/* The card: frosted navy, a hairline cyan edge and a soft glow. */}
          <div className="relative w-full max-w-[26rem] shrink-0">
            <div aria-hidden className="absolute -inset-px rounded-3xl bg-gradient-to-b from-teal-300/40 via-white/10 to-transparent" />
            <div className="relative rounded-3xl bg-[#071226]/30 p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7),0_0_60px_-20px_rgb(56_189_248/0.35)] backdrop-blur-md sm:p-8">
              <h1 className="text-2xl font-bold tracking-[-0.02em]">{t('login.title')}</h1>
              <p className="mt-1 text-sm text-white/60">{t('login.subtitle')}</p>

              {passwordSetUp && (
                <p role="status" className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-2.5 text-xs text-emerald-100">
                  {t('login.passwordSetUp')}
                </p>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs text-white/70">
                    {t('login.email')}
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoFocus
                    autoComplete="username"
                    placeholder={t('login.emailPlaceholder')}
                    aria-invalid={Boolean(errors.email)}
                    className={INPUT_CLASS}
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-red-300">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs text-white/70">
                    {t('login.password')}
                  </Label>
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    showLabel={t('action.showPassword', { ns: 'common' })}
                    hideLabel={t('action.hidePassword', { ns: 'common' })}
                    className={INPUT_CLASS}
                    toggleClassName="text-slate-400 hover:text-slate-200"
                    {...register('password')}
                  />
                  {errors.password && <p className="text-xs text-red-300">{errors.password.message}</p>}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="login-remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-white/40"
                  />
                  <Label htmlFor="login-remember" className="cursor-pointer text-xs font-normal text-white/70">
                    {t('login.rememberMe')}
                  </Label>
                </div>

                {submitError && (
                  <p className="text-sm text-red-300" role="alert">
                    {submitError}
                  </p>
                )}

                <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  {isSubmitting ? t('login.submitting') : t('login.submit')}
                </Button>
              </form>

              <p className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-white/50">{t('login.noAccount')}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
