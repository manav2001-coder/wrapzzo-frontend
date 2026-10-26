import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { ApiError } from '@/lib/axiosClient'

type Values = { password: string; confirmPassword: string }

interface SetPasswordPanelProps {
  /** Exchanges the invite token for a password: the user or the vendor endpoint. */
  setup: (token: string, password: string, confirmPassword: string) => Promise<unknown>
  /** The card's sub-heading, which names the kind of account being set up. */
  subtitle: string
}

/**
 * Finishes an invited account: the emailed link carries a one-time token, the person picks a
 * password, and lands on sign-in (a freshly set-up account signs in deliberately, not straight in).
 * Shared by the company/platform user and vendor invite pages, which differ only in the endpoint.
 */
export function SetPasswordPanel({ setup, subtitle }: SetPasswordPanelProps) {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = z
    .object({
      password: z.string().min(1, t('setPassword.required')).min(8, t('setPassword.minLength')),
      confirmPassword: z.string().min(1, t('setPassword.required')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('setPassword.mismatch'),
      path: ['confirmPassword'],
    })
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirmPassword: '' } })

  async function onSubmit(values: Values) {
    setSubmitError(null)
    try {
      await setup(token, values.password, values.confirmPassword)
      navigate('/login', { replace: true, state: { passwordSetUp: true } })
    } catch (error) {
      // These calls are raw axios (no session exists yet), so read the backend's own reason here.
      const message =
        error instanceof ApiError
          ? error.message
          : axios.isAxiosError(error)
            ? (error.response?.data as { error?: string } | undefined)?.error
            : undefined
      setSubmitError(message ?? t('setPassword.invalidToken'))
    }
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('setPassword.title')}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {t('setPassword.missingToken')}
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="setup-password">{t('setPassword.password')}</Label>
                <PasswordInput
                  id="setup-password"
                  autoFocus
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  showLabel={t('action.showPassword', { ns: 'common' })}
                  hideLabel={t('action.hidePassword', { ns: 'common' })}
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup-confirm">{t('setPassword.confirm')}</Label>
                <PasswordInput
                  id="setup-confirm"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  showLabel={t('action.showPassword', { ns: 'common' })}
                  hideLabel={t('action.hidePassword', { ns: 'common' })}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {submitError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? t('setPassword.submitting') : t('setPassword.submit')}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              {t('setPassword.backToSignIn')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
