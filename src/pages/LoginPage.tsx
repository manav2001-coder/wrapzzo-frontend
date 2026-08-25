import { zodResolver } from '@hookform/resolvers/zod'
import { Layers, Megaphone, Store, Zap } from 'lucide-react'
import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { Password } from 'primereact/password'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { login } from '@/api/auth'
import { vendorLogin } from '@/api/vendorAuth'
import { useAppDispatch } from '@/app/hooks'
import { isSuperAdmin } from '@/config/auth'
import { setCredentials } from '@/features/auth/authSlice'
import { setVendorCredentials } from '@/features/vendorAuth/vendorAuthSlice'
import { ApiError } from '@/lib/axiosClient'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const CAMPAIGNS_SURFACE_PATHS = ['/campaigns', '/my-campaigns', '/approvals', '/orders']

const ACTIVITY_FEED = [
  { dot: 'bg-sky-400', time: '14:22', label: 'Quick Gift sent', detail: '· to Rohan Verma' },
  { dot: 'bg-sky-400', time: '14:31', label: 'Bulk Gifting batch confirmed', detail: '500 recipients' },
  { dot: 'bg-emerald-400', time: '14:47', label: 'Campaign order approved', detail: '· Diwali Gifting Campaign' },
]

const GIFTING_CAPABILITIES = [
  { Icon: Store, title: 'Gift Store', description: 'Browse and choose from the gift catalogue.' },
  { Icon: Zap, title: 'Quick Gifts', description: 'Send a gift to one recipient, fast.' },
  { Icon: Layers, title: 'Bulk Gifting', description: 'Send to hundreds or thousands at once.' },
  { Icon: Megaphone, title: 'Campaigns', description: 'Coordinate team-driven gifting initiatives.' },
]

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const requestedFrom = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
  // Only honor the redirect-back target if it actually belongs to the side that just
  // authenticated -- otherwise an admin who got bounced here from a vendor-only route
  // (or vice versa) would land somewhere their session can't access.
  const fromForAdmin = requestedFrom?.startsWith('/admin') ? requestedFrom : undefined
  const fromForCampaigns = CAMPAIGNS_SURFACE_PATHS.some((p) => requestedFrom?.startsWith(p)) ? requestedFrom : undefined
  const fromForVendor = requestedFrom?.startsWith('/vendor') ? requestedFrom : undefined

  function lockedMessage(error: ApiError): string {
    const lockedUntil = (error.data as { lockedUntil?: string } | undefined)?.lockedUntil
    return lockedUntil
      ? `Too many failed attempts. Account locked until ${new Date(lockedUntil).toLocaleTimeString()}.`
      : 'Too many failed attempts. Please try again later.'
  }

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const tokens = await login(values.email, values.password)
      dispatch(setCredentials({ ...tokens, email: values.email, rememberMe }))
      const defaultLanding = isSuperAdmin(values.email) ? '/admin' : '/campaigns'
      navigate((isSuperAdmin(values.email) ? fromForAdmin : fromForCampaigns) ?? defaultLanding, { replace: true })
      return
    } catch (userError) {
      if (userError instanceof ApiError && userError.status === 423) {
        setSubmitError(lockedMessage(userError))
        setSubmitting(false)
        return
      }
      // Not a recognized platform user -- this same login form doubles as the
      // vendor portal's entry point, so try that identity before giving up.
      try {
        const tokens = await vendorLogin(values.email, values.password)
        dispatch(setVendorCredentials({ ...tokens, email: values.email, rememberMe }))
        navigate(fromForVendor ?? '/vendor', { replace: true })
        return
      } catch (vendorError) {
        if (vendorError instanceof ApiError && vendorError.status === 423) {
          setSubmitError(lockedMessage(vendorError))
        } else {
          setSubmitError('Invalid email or password')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-bg lg:grid-cols-2">
      <div className="relative isolate flex flex-col items-center justify-center gap-8 overflow-hidden px-4 py-12 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-dot) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-8px_rgba(0,0,0,0.12)]">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">
              W
            </div>
            <span className="text-lg font-semibold tracking-tight text-text">Wrappzo</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-text">Welcome back</h1>
          <p className="mt-2 mb-6 text-base text-text-muted">
            Sign in to manage campaigns, track submissions, and keep every order moving toward dispatch.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-text">
                Email address
              </label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <InputText
                    id="email"
                    {...field}
                    autoFocus
                    autoComplete="username"
                    className={`h-11 w-full rounded-[10px] text-sm ${errors.email ? 'p-invalid' : ''}`}
                    placeholder="you@company.com"
                  />
                )}
              />
              {errors.email && <small className="text-red-500 dark:text-red-400">{errors.email.message}</small>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-text">
                Password
              </label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Password
                    inputId="password"
                    {...field}
                    toggleMask
                    feedback={false}
                    autoComplete="current-password"
                    inputClassName="h-11 w-full rounded-[10px] text-sm"
                    className={errors.password ? 'p-invalid w-full' : 'w-full'}
                    placeholder="••••••••"
                  />
                )}
              />
              {errors.password && <small className="text-red-500 dark:text-red-400">{errors.password.message}</small>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox inputId="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.checked ?? false)} />
              <label htmlFor="rememberMe" className="cursor-pointer text-sm text-text-muted">
                Remember me
              </label>
            </div>

            {submitError && <Message severity="error" text={submitError} className="w-full justify-start" />}

            <Button
              type="submit"
              label="Continue"
              loading={submitting}
              className="mt-2 w-full justify-center rounded-[10px] border-none bg-[#2e5ad1] font-medium hover:bg-[#25489f]"
            />
          </form>
        </div>
      </div>

      <div className="relative hidden flex-col justify-between overflow-hidden bg-black p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 100% 0%, rgba(46,90,209,0.35), transparent 60%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(46,90,209,0.2), transparent 60%)',
          }}
        />

        <div className="relative flex items-center justify-end">
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white">
            <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
            LIVE &middot; CORPORATE GIFTING PLATFORM
          </div>
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-balance text-5xl font-semibold tracking-tight">
              Choose the gift. Send it to one person or thousands.
            </h2>
            <p className="max-w-md text-sm text-white/70">
              Campaigns, Quick Gifts, Bulk Gifting, and the Gift Store — every way your company sends a gift, in one
              place.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
            {ACTIVITY_FEED.map((item) => (
              <div key={item.time} className="flex items-center gap-2.5 text-sm">
                <span className={`size-1.5 shrink-0 rounded-full ${item.dot}`} />
                <span className="font-mono text-xs text-white/50">{item.time}</span>
                <span className="font-semibold text-white">{item.label}</span>
                <span className="text-white/70">{item.detail}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {GIFTING_CAPABILITIES.map(({ Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex size-7 items-center justify-center rounded-md bg-white/10">
                  <Icon className="size-3.5 text-white" strokeWidth={1.75} />
                </div>
                <p className="text-xs font-medium text-white">{title}</p>
                <p className="text-xs leading-snug text-white/55">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
