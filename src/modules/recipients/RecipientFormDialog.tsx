import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Recipient } from '@/api/recipients'
import { AppDialog } from '@/components/app-dialog'
import { LabelledField } from '@/components/fields/labelled-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateMyDoctor, useUpdateRecipient } from '@/hooks/useRecipients'

interface Draft {
  name: string
  phone: string
  pcode: string
  email: string
  address: string
  qualification: string
  speciality: string
  clinicName: string
}

function draftFrom(recipient: Recipient | null | undefined): Draft {
  return {
    name: recipient?.name ?? '',
    phone: recipient?.phone ?? '',
    pcode: recipient?.pcode ?? '',
    email: recipient?.email ?? '',
    address: recipient?.address ?? '',
    qualification: recipient?.doctor?.qualification ?? '',
    speciality: recipient?.doctor?.speciality ?? '',
    clinicName: recipient?.doctor?.clinicName ?? '',
  }
}

/**
 * Add a doctor (they go on the caller's own list, or join it when the pcode is already
 * a company doctor), or edit one. The caller remounts it per doctor (`key`), so it starts from that
 * doctor's values rather than syncing them in an effect.
 */
export function RecipientFormDialog({
  visible,
  onHide,
  recipient,
}: {
  visible: boolean
  onHide: () => void
  recipient?: Recipient | null
}) {
  const { t } = useTranslation('recipients')
  const showError = useApiErrorToast()
  const createRecipient = useCreateMyDoctor()
  const updateRecipient = useUpdateRecipient()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(recipient))
  const [errors, setErrors] = useState<Partial<Record<'name' | 'phone' | 'pcode', string>>>({})
  const isEdit = Boolean(recipient)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  async function submit() {
    const next: typeof errors = {}
    if (!draft.name.trim()) next.name = t('field.required')
    if (!draft.phone.trim()) next.phone = t('field.required')
    if (!draft.pcode.trim()) next.pcode = t('field.required')
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const input = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      pcode: draft.pcode.trim(),
      email: draft.email.trim() || undefined,
      address: draft.address.trim() || undefined,
      // Always sent from this form (it shows them), so clearing a field here really clears it.
      doctor: {
        qualification: draft.qualification.trim() || null,
        speciality: draft.speciality.trim() || null,
        clinicName: draft.clinicName.trim() || null,
      },
    }
    try {
      if (recipient) {
        await updateRecipient.mutateAsync({ id: recipient.id, input })
        toast.success(t('directory.updated'))
      } else {
        await createRecipient.mutateAsync(input)
        toast.success(t('directory.added'))
      }
      onHide()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <AppDialog
      open={visible}
      onOpenChange={(open) => !open && onHide()}
      size="md"
      title={isEdit ? t('directory.editTitle') : t('directory.addTitle')}
      confirmLabel={isEdit ? t('directory.save') : t('directory.add')}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      loading={createRecipient.isPending || updateRecipient.isPending}
      onConfirm={() => void submit()}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabelledField id="recipient-pcode" label={`${t('field.pcode')} *`} error={errors.pcode} hint={t('field.pcodeHint')} className="sm:col-span-2">
          <Input id="recipient-pcode" value={draft.pcode} aria-invalid={Boolean(errors.pcode)} onChange={(e) => set({ pcode: e.target.value })} />
        </LabelledField>
        <LabelledField id="recipient-name" label={`${t('field.name')} *`} error={errors.name} className="sm:col-span-2">
          <Input id="recipient-name" value={draft.name} aria-invalid={Boolean(errors.name)} onChange={(e) => set({ name: e.target.value })} />
        </LabelledField>
        <LabelledField id="recipient-phone" label={`${t('field.phone')} *`} error={errors.phone}>
          <Input id="recipient-phone" type="tel" value={draft.phone} aria-invalid={Boolean(errors.phone)} onChange={(e) => set({ phone: e.target.value })} />
        </LabelledField>
        <LabelledField id="recipient-email" label={t('field.email')} className="sm:col-span-2">
          <Input id="recipient-email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
        </LabelledField>
        <LabelledField id="recipient-address" label={t('field.address')} className="sm:col-span-2">
          <Textarea id="recipient-address" rows={2} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
        </LabelledField>

        <p className="pt-1 text-xs font-semibold text-muted-foreground sm:col-span-2">{t('field.doctorSection')}</p>
        <LabelledField id="recipient-qualification" label={t('field.qualification')}>
          <Input id="recipient-qualification" value={draft.qualification} onChange={(e) => set({ qualification: e.target.value })} />
        </LabelledField>
        <LabelledField id="recipient-speciality" label={t('field.speciality')}>
          <Input id="recipient-speciality" value={draft.speciality} onChange={(e) => set({ speciality: e.target.value })} />
        </LabelledField>
        <LabelledField id="recipient-clinic" label={t('field.clinicName')}>
          <Input id="recipient-clinic" value={draft.clinicName} onChange={(e) => set({ clinicName: e.target.value })} />
        </LabelledField>
      </div>
    </AppDialog>
  )
}
