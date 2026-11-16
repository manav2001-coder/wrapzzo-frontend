import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import type { ProfileKind, UserProfile, VendorProfile } from '@/api/profile'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useProfile, useProfileActions } from '@/hooks/use-profile'
import { PHOTO_ACCEPT, photoProblem, prepareProfilePhoto } from '@/lib/profile-photo'

const PHONE_PATTERN = /^[+0-9][0-9 ()-]{6,19}$/

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2)
  return letters ? letters.toUpperCase() : '?'
}

/** What the profile shows of a person or a vendor, in one shape, so the page below does not care which it is. */
function describe(kind: ProfileKind, profile: UserProfile | VendorProfile, t: (key: string) => string) {
  if (kind === 'vendor') {
    const vendor = profile as VendorProfile
    return {
      name: vendor.name,
      photoUrl: vendor.photoUrl,
      phone: vendor.contactPhone ?? '',
      locked: [
        { label: t('details.businessName'), value: vendor.name },
        { label: t('details.email'), value: vendor.contactEmail },
        { label: t('details.vendorNumber'), value: vendor.vendorNumber },
      ],
    }
  }
  const person = profile as UserProfile
  return {
    name: person.name,
    photoUrl: person.photoUrl,
    phone: person.mobile ?? '',
    locked: [
      { label: t('details.name'), value: person.name },
      { label: t('details.email'), value: person.email },
      { label: t('details.role'), value: person.roleName },
      { label: t('details.designation'), value: person.designation },
      { label: t('details.employeeCode'), value: person.employeeCode },
      { label: t('details.orgUnit'), value: person.orgUnitName },
      { label: t('details.manager'), value: person.managerName },
      { label: t('details.company'), value: person.companyName },
    ],
  }
}

/**
 * The signed-in person's (or vendor's) own page: a picture, a phone number and a password -- the three things that are theirs
 * to change. Everything else is shown, locked, because their admin (or Wrappzo, for a vendor) decides it.
 */
export function ProfilePage({ kind }: { kind: ProfileKind }) {
  const { t } = useTranslation('profile')
  const { data: profile, isLoading } = useProfile(kind)

  return (
    <div className="mx-auto w-full max-w-2xl">
      <MasterPageHeader title={t('title')} description={kind === 'vendor' ? t('vendorSubtitle') : t('subtitle')} />
      {isLoading || !profile ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <ProfileSections kind={kind} profile={profile} />
      )}
    </div>
  )
}

function ProfileSections({ kind, profile }: { kind: ProfileKind; profile: UserProfile | VendorProfile }) {
  const { t } = useTranslation('profile')
  const shown = describe(kind, profile, t)
  return (
    <div className="space-y-4">
      <PhotoCard kind={kind} name={shown.name} photoUrl={shown.photoUrl} />
      <DetailsCard kind={kind} locked={shown.locked} phone={shown.phone} />
      <PasswordCard kind={kind} />
    </div>
  )
}

function PhotoCard({ kind, name, photoUrl }: { kind: ProfileKind; name: string; photoUrl: string | null }) {
  const { t } = useTranslation('profile')
  const showError = useApiErrorToast()
  const { savePhoto, deletePhoto } = useProfileActions(kind)
  const input = useRef<HTMLInputElement>(null)
  const busy = savePhoto.isPending || deletePhoto.isPending

  async function onChoose(file: File | undefined) {
    if (!file) return
    const problem = photoProblem(file)
    if (problem) {
      toast.error(problem === 'type' ? t('photo.wrongType') : t('photo.tooLarge'))
      return
    }
    try {
      const picture = await prepareProfilePhoto(file)
      await savePhoto.mutateAsync(picture)
      toast.success(t('photo.saved'))
    } catch (error) {
      showError(error, t('photo.failed'))
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function onRemove() {
    try {
      await deletePhoto.mutateAsync()
      toast.success(t('photo.removed'))
    } catch (error) {
      showError(error, t('photo.failed'))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{kind === 'vendor' ? t('photo.logoTitle') : t('photo.title')}</CardTitle>
        <CardDescription>{t('photo.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar className="h-20 w-20 text-xl">
          {photoUrl && <AvatarImage src={photoUrl} alt="" />}
          <AvatarFallback>{initialsOf(name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept={PHOTO_ACCEPT} className="sr-only" aria-label={t('photo.change')} onChange={(e) => void onChoose(e.target.files?.[0])} />
          <Button type="button" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {savePhoto.isPending ? <Loader2 className="animate-spin" /> : <Camera />}
            {savePhoto.isPending ? t('photo.saving') : photoUrl ? t('photo.change') : t('photo.add')}
          </Button>
          {photoUrl && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void onRemove()}>
              <Trash2 />
              {t('photo.remove')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DetailsCard({ kind, locked, phone }: { kind: ProfileKind; locked: { label: string; value: string | null }[]; phone: string }) {
  const { t } = useTranslation('profile')
  const showError = useApiErrorToast()
  const { savePhone } = useProfileActions(kind)
  const [value, setValue] = useState(phone)
  const [saved, setSaved] = useState(phone)
  const valid = PHONE_PATTERN.test(value.trim())
  const changed = value.trim() !== saved

  async function onSave() {
    try {
      await savePhone.mutateAsync(value.trim())
      setSaved(value.trim())
      toast.success(t('phone.saved'))
    } catch (error) {
      showError(error, t('phone.failed'))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('details.title')}</CardTitle>
        <CardDescription>{kind === 'vendor' ? t('details.vendorLockedNote') : t('details.lockedNote')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2">
          {locked
            .filter((row) => row.value)
            .map((row) => (
              <div key={row.label} className="flex min-w-0 items-baseline gap-3 text-sm">
                <dt className="w-28 shrink-0 text-xs text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 flex-1 break-words">{row.value}</dd>
              </div>
            ))}
        </dl>
        <form
          className="space-y-1.5 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid && changed) void onSave()
          }}
          noValidate
        >
          <Label htmlFor="profile-phone">{kind === 'vendor' ? t('phone.vendorLabel') : t('phone.label')}</Label>
          <div className="flex gap-2">
            <Input id="profile-phone" inputMode="tel" autoComplete="tel" value={value} aria-invalid={value !== '' && !valid} onChange={(e) => setValue(e.target.value)} />
            <Button type="submit" disabled={!valid || !changed || savePhone.isPending}>
              {savePhone.isPending && <Loader2 className="animate-spin" />}
              {savePhone.isPending ? t('phone.saving') : t('phone.save')}
            </Button>
          </div>
          {value !== '' && !valid && <p className="text-xs text-destructive">{t('phone.invalid')}</p>}
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordCard({ kind }: { kind: ProfileKind }) {
  const { t } = useTranslation('profile')
  const { t: tc } = useTranslation('common')
  const showError = useApiErrorToast()
  const { savePassword } = useProfileActions(kind)

  const schema = z
    .object({
      currentPassword: z.string().min(1, t('password.required')),
      newPassword: z.string().min(1, t('password.required')).min(8, t('password.minLength')),
      confirmPassword: z.string().min(1, t('password.required')),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { message: t('password.mismatch'), path: ['confirmPassword'] })
    .refine((v) => v.newPassword !== v.currentPassword, { message: t('password.same'), path: ['newPassword'] })
  type Values = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } })

  async function onSubmit(values: Values) {
    try {
      await savePassword.mutateAsync(values)
      toast.success(t('password.done'))
      reset()
    } catch (error) {
      showError(error, t('password.failed'))
    }
  }

  const field = (id: 'currentPassword' | 'newPassword' | 'confirmPassword', label: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pw-${id}`}>{label}</Label>
      <PasswordInput
        id={`pw-${id}`}
        autoComplete={autoComplete}
        aria-invalid={Boolean(errors[id])}
        showLabel={tc('action.showPassword')}
        hideLabel={tc('action.hidePassword')}
        {...register(id)}
      />
      {errors[id] && <p className="text-xs text-destructive">{errors[id]?.message}</p>}
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('password.title')}</CardTitle>
        <CardDescription>{t('password.hint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {field('currentPassword', t('password.current'), 'current-password')}
          {field('newPassword', t('password.new'), 'new-password')}
          {field('confirmPassword', t('password.confirm'), 'new-password')}
          <Button type="submit" disabled={savePassword.isPending} className="max-sm:w-full">
            {savePassword.isPending && <Loader2 className="animate-spin" />}
            {savePassword.isPending ? t('password.submitting') : t('password.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
