import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { resetPassword } from '@/api/auth'
import { resetVendorPassword } from '@/api/vendorAuth'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'

type Values = { newPassword: string; confirmPassword: string }

/** The page the emailed link opens, for a person or a vendor: choose a new password. It does not sign anyone in; it sends them to sign in. */
export function ResetPasswordPage({ kind = 'user' }: { kind?: 'user' | 'vendor' }) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = z
    .object({
      newPassword: z.string().min(1, t('reset.required')).min(8, t('setPassword.minLength')),
      confirmPassword: z.string().min(1, t('reset.required')),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { message: t('setPassword.mismatch'), path: ['confirmPassword'] })
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { newPassword: '', confirmPassword: '' } })

  async function onSubmit(values: Values) {
    setSubmitError(null)
    try {
      await (kind === 'vendor' ? resetVendorPassword : resetPassword)(token, values.newPassword, values.confirmPassword)
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (error) {
      // The server says why (a weak password, a link that has run out), in words meant for this page.
      const reason = axios.isAxiosError(error) ? (error.response?.data as { error?: string } | undefined)?.error : undefined
      setSubmitError(reason ?? t('reset.failed'))
    }
  }

  const field = (id: 'newPassword' | 'confirmPassword', label: string, autoFocus = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={`reset-${id}`}>{label}</Label>
      <PasswordInput
        id={`reset-${id}`}
        autoFocus={autoFocus}
        autoComplete="new-password"
        aria-invalid={Boolean(errors[id])}
        showLabel={tc('action.showPassword')}
        hideLabel={tc('action.hidePassword')}
        {...register(id)}
      />
      {errors[id] && <p className="text-xs text-destructive">{errors[id]?.message}</p>}
    </div>
  )

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('reset.title')}</CardTitle>
          <CardDescription>{t('reset.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {t('reset.missingToken')}
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {field('newPassword', t('reset.newPassword'), true)}
              {field('confirmPassword', t('setPassword.confirm'))}
              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {submitError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? t('reset.submitting') : t('reset.submit')}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            {!token || submitError ? (
              <Link to="/forgot-password" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                {t('reset.askAgain')}
              </Link>
            ) : (
              <Link to="/login" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                {t('setPassword.backToSignIn')}
              </Link>
            )}
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
