import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { forgotPassword } from '@/api/auth'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Asks for a reset link. Whoever types an email, whatever it is, sees the same thing afterwards -- "if there is an account, we sent
 * a link" -- so this page cannot be used to find out who has an account. People and vendors use the same page.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [sent, setSent] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const schema = z.object({ email: z.string().min(1, t('forgot.required')).email(t('forgot.invalid')) })
  type Values = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  async function onSubmit(values: Values) {
    setFailed(false)
    try {
      await forgotPassword(values.email.trim())
      setSent(values.email.trim())
    } catch {
      // Only a failure to reach the server says anything: the server never says whether an account exists.
      setFailed(true)
    }
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{sent ? t('forgot.sentTitle') : t('forgot.title')}</CardTitle>
          <CardDescription>{sent ? t('forgot.sentBody', { email: sent }) : t('forgot.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-sm">
              <p className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-3">
                <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{t('forgot.sentHint')}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">{t('forgot.email')}</Label>
                <Input id="forgot-email" type="email" autoFocus autoComplete="username" placeholder={t('login.emailPlaceholder')} aria-invalid={Boolean(errors.email)} {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              {failed && (
                <p role="alert" className="text-sm text-destructive">
                  {t('forgot.failed')}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? t('forgot.submitting') : t('forgot.submit')}
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
