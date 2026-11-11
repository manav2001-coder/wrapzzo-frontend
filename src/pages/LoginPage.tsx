import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, FileText, Info, Loader2, MapPin } from 'lucide-react'
import { useState } from 'react'
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

/** The pipeline illustration's columns: how many placeholder cards each holds. It is decorative, never real data. */
const PIPELINE = [
  { key: 'requested', cards: 2, active: false },
  { key: 'inReview', cards: 2, active: false },
  { key: 'approved', cards: 2, active: false },
  { key: 'inPrint', cards: 2, active: false },
  { key: 'delivered', cards: 2, active: true },
] as const

const SELLING_POINTS = [
  { icon: CircleCheck, key: 'approvals' },
  { icon: FileText, key: 'artwork' },
  { icon: MapPin, key: 'tracking' },
] as const

/** Inputs on the light form panel. */
const INPUT_CLASS =
  'h-12 rounded-xl border-[#D5E2DA] bg-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_100px_#fff_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#0B2F23] px-3.5 text-base text-[#0B2F23] placeholder:text-[#5A7466] focus-visible:border-[#17794D] focus-visible:ring-2 focus-visible:ring-[#17794D] focus-visible:ring-offset-0'

type LoginFormValues = { email: string; password: string }

export function LoginPage() {
  const { t } = useTranslation('auth')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)

  const schema = z.object({
    // Trimmed and lower-cased before anything else, so " Priya@Acme.com " signs in as priya@acme.com.
    email: z.string().trim().toLowerCase().min(1, t('login.emailRequired')).email(t('login.emailInvalid')),
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
      // The password was right but the company is switched off: say so, rather than a vague "failed".
      if (userError instanceof ApiError && userError.status === 403 && userError.message) {
        setSubmitError(userError.message)
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

  return (
    <div className="flex min-h-svh flex-col bg-[#F4F8F5] text-[#0B2F23] antialiased lg:flex-row-reverse">
      {/* Form panel */}
      <section className="flex min-w-0 flex-col px-6 py-8 sm:px-10 lg:flex-[1_1_480px] lg:px-[clamp(40px,5vw,88px)] lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17794D] focus-visible:ring-offset-2">
            <WrapzzoLogo height={40} tone="dark" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-[#3E5A4D] hover:text-[#0B2F23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17794D]"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t('login.backToSite')}
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem] rounded-2xl border border-[#0B2F23]/[0.07] bg-white px-6 py-7 shadow-[0_8px_30px_-12px_rgb(11_47_35/0.10)] sm:px-9 sm:py-9">
            <h1 className="text-[1.75rem] font-extrabold leading-[1.15] tracking-[-0.03em]">{t('login.title')}</h1>
            <p className="mt-3 text-base leading-relaxed text-[#3E5A4D]">{t('login.subtitle')}</p>

            {passwordSetUp && (
              <p role="status" className="mt-6 rounded-xl border border-[#17794D]/30 bg-[#E1F0E7] px-3.5 py-3 text-sm text-[#0B2F23]">
                {t('login.passwordSetUp')}
              </p>
            )}

            {submitError && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#FDA29B] bg-[#FEF3F2] px-3.5 py-3 text-sm leading-normal text-[#B42318]"
              >
                <CircleAlert aria-hidden className="mt-px size-[18px] shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6" noValidate>
              <div>
                <Label htmlFor="login-email" className="text-sm font-semibold text-[#0B2F23]">
                  {t('login.email')}
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  placeholder={t('login.emailPlaceholder')}
                  aria-invalid={Boolean(errors.email)}
                  className={`mt-2 ${INPUT_CLASS}`}
                  {...register('email')}
                />
                {errors.email && <p className="mt-1.5 text-sm text-[#B42318]">{errors.email.message}</p>}
              </div>

              <div className="mt-5">
                <Label htmlFor="login-password" className="text-sm font-semibold text-[#0B2F23]">
                  {t('login.password')}
                </Label>
                <div className="mt-2">
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder={t('login.passwordPlaceholder')}
                    aria-invalid={Boolean(errors.password)}
                    showLabel={t('action.showPassword', { ns: 'common' })}
                    hideLabel={t('action.hidePassword', { ns: 'common' })}
                    className={INPUT_CLASS}
                    toggleClassName="text-[#3E5A4D] hover:text-[#0B2F23]"
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="mt-1.5 text-sm text-[#B42318]">{errors.password.message}</p>}
              </div>

              <div className="mt-3 flex min-h-11 items-center gap-2.5">
                <Checkbox
                  id="login-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="size-[18px] border-[#5A7466] data-[state=checked]:border-[#17794D] data-[state=checked]:bg-[#17794D]"
                />
                <Label htmlFor="login-remember" className="cursor-pointer text-sm font-medium text-[#3E5A4D]">
                  {t('login.rememberMe')}
                </Label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 h-[54px] w-full gap-2.5 rounded-xl bg-[#0E3B2C] text-base font-bold text-white hover:bg-[#145238]"
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? t('login.submitting') : t('login.submit')}
                {!isSubmitting && <ArrowRight aria-hidden className="size-[18px]" />}
              </Button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#EAF4EE] px-4 py-3.5 text-sm leading-relaxed">
              <Info aria-hidden className="mt-0.5 size-[18px] shrink-0 text-[#17794D]" />
              <span>
                <strong>{t('login.noAccountTitle')}</strong> {t('login.noAccount')}
              </span>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[13px] text-[#3E5A4D]">
          <span>{t('login.footer')}</span>
          <span>
            {t('login.support')}{' '}
            <a href="mailto:support@wrappzo.com" className="font-semibold text-[#17794D] underline">
              support@wrappzo.com
            </a>
          </span>
        </footer>
      </section>

      {/* Brand panel: large screens only; on a phone the form is the page. */}
      <aside className="hidden min-w-0 flex-col justify-center gap-9 px-[clamp(32px,5vw,88px)] py-16 text-white [background:linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px)_0_0/48px_48px,linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)_0_0/48px_48px,linear-gradient(135deg,#0E3B2C_0%,#145238_55%,#1B7A53_100%)] lg:flex lg:flex-[1.15_1_560px]">
        <div>
          <p className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 font-mono text-xs uppercase tracking-[0.14em]">
            <span aria-hidden className="size-2 rounded-full bg-[#6EE7B7]" />
            {t('hero.eyebrow')}
          </p>
          <h2 className="mt-6 max-w-[620px] text-[clamp(2rem,3.4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.035em]">
            {t('hero.headlineLead')} <span className="text-[#6EE7B7]">{t('hero.headlineAccent')}</span>
          </h2>
          <p className="mt-4 max-w-[540px] text-base leading-relaxed text-white/85">{t('hero.description')}</p>
        </div>

        {/* Decorative pipeline illustration (no real data) */}
        <div aria-hidden className="max-w-[720px] rounded-[20px] border border-white/20 bg-white/[0.07] p-6 shadow-[0_30px_80px_rgb(0_0_0/0.25)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/85">
              <span className="size-2 rounded-full bg-[#6EE7B7]" />
              {t('hero.pipeline.title')}
            </div>
            <span className="text-xs text-white/70">{t('hero.pipeline.illustration')}</span>
          </div>
          <div className="flex gap-3">
            {PIPELINE.map((column, columnIndex) => (
              <div key={column.key} className="min-w-0 flex-1">
                <div className={`mb-2.5 flex items-center gap-1.5 text-xs font-semibold ${column.active ? 'text-[#6EE7B7]' : 'text-white/90'}`}>
                  <span className={`size-2 rounded-full ${column.active ? 'bg-[#6EE7B7]' : 'bg-white/50'}`} />
                  {t(`hero.pipeline.${column.key}`)}
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: column.cards }, (_, card) => {
                    const highlighted = column.key === 'inReview' && card === 0
                    const width = 56 + ((columnIndex * 7 + card * 5) % 20)
                    return (
                      <div
                        key={card}
                        className={`rounded-[10px] border p-2.5 ${highlighted ? 'border-[#6EE7B7]/75 bg-[#6EE7B7]/15' : 'border-white/10 bg-white/[0.09]'}`}
                      >
                        <div className="flex items-center gap-2">
                          {column.active && <CircleCheck className="size-3.5 shrink-0 text-[#6EE7B7]" strokeWidth={3} />}
                          <div className="flex-1">
                            <div className={`h-[7px] rounded ${highlighted ? 'bg-[#6EE7B7]' : 'bg-white/60'}`} style={{ width: `${width}%` }} />
                            <div className={`mt-2 h-1.5 rounded ${highlighted ? 'bg-[#6EE7B7]/50' : 'bg-white/30'}`} style={{ width: `${86 - width / 2}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <ul className="flex max-w-[720px] gap-6">
          {SELLING_POINTS.map((point) => (
            <li key={point.key} className="min-w-0 flex-1">
              <span className="flex size-10 items-center justify-center rounded-xl border border-[#6EE7B7]/40 bg-[#6EE7B7]/15 text-[#6EE7B7]">
                <point.icon aria-hidden className="size-5" />
              </span>
              <p className="mt-3.5 text-base font-bold">{t(`hero.points.${point.key}.title`)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">{t(`hero.points.${point.key}.body`)}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
