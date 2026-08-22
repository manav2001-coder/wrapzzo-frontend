import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import { Password } from 'primereact/password'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { setupPassword } from '@/api/auth'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'

const setupSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SetupFormValues = z.infer<typeof setupSchema>

/** For bulk-imported (or otherwise password-less) platform users -- the admin-side counterpart of SetupVendorPasswordPage. */
export function SetupPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: SetupFormValues) {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const tokens = await setupPassword(token, values.password, values.confirmPassword)
      // The setup link doesn't carry the user's email, so the topbar shows it blank
      // until their next real login -- a minor cosmetic gap, not worth a profile fetch here.
      dispatch(setCredentials({ ...tokens, email: '' }))
      navigate('/admin', { replace: true })
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { error?: string } | undefined)?.error ?? 'Something went wrong. Please try again.')
        : 'Something went wrong. Please try again.'
      setSubmitError(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-8px_rgba(0,0,0,0.12)]">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">W</div>
          <span className="text-lg font-semibold tracking-tight text-text">Wrappzo</span>
        </div>

        {!token ? (
          <Message severity="error" text="This link is missing its setup token. Ask for a new invite email." className="w-full justify-start" />
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-text">Set up your password</h1>
            <p className="mt-2 mb-6 text-base text-text-muted">Choose a password for your Wrapzzo account.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
                      autoComplete="new-password"
                      inputClassName="h-11 w-full rounded-[10px] text-sm"
                      className={errors.password ? 'p-invalid w-full' : 'w-full'}
                    />
                  )}
                />
                {errors.password && <small className="text-red-500 dark:text-red-400">{errors.password.message}</small>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-text">
                  Confirm password
                </label>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <Password
                      inputId="confirmPassword"
                      {...field}
                      toggleMask
                      feedback={false}
                      autoComplete="new-password"
                      inputClassName="h-11 w-full rounded-[10px] text-sm"
                      className={errors.confirmPassword ? 'p-invalid w-full' : 'w-full'}
                    />
                  )}
                />
                {errors.confirmPassword && (
                  <small className="text-red-500 dark:text-red-400">{errors.confirmPassword.message}</small>
                )}
              </div>

              {submitError && <Message severity="error" text={submitError} className="w-full justify-start" />}

              <Button type="submit" label="Set password" loading={submitting} className="mt-2 w-full justify-center rounded-[10px]" />
            </form>
          </>
        )}
      </div>
    </div>
  )
}
