import { AlertTriangle, ArrowLeft, Camera, ChevronDown, ChevronUp, Contact, Gift as GiftIcon, Palette, Plus, Send, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { uploadQuickGiftPhoto, type QuickGiftPhotoValue } from '@/api/quickGifts'
import type { DoctorDetails, Recipient, UpcomingBirthday } from '@/api/recipients'
import { EmptyState } from '@/components/empty-state'
import { DatePicker } from '@/components/fields/date-picker'
import { FormSkeleton } from '@/components/fields/form-skeleton'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { LabelledField } from '@/components/fields/labelled-field'
import { Textarea } from '@/components/ui/textarea'
import { useActiveGifts } from '@/hooks/useGifts'
import { useCreateQuickGiftRequest } from '@/hooks/useQuickGifts'
import { useCreateRecurringOrderPlan } from '@/hooks/useRecurringOrders'
import { fromDateOnly, toDateOnly } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { GiftThumbnail } from '@/modules/admin/gifts/GiftThumbnail'
import { RecipientPickerDialog } from '@/modules/recipients/RecipientPickerDialog'

const MAX_QUANTITY = 100_000

/** The prescription-pad print details, as typed (empty string = not given). */
interface DoctorFields {
  qualification: string
  registrationNumber: string
  speciality: string
  clinicName: string
}

interface DraftRecipient {
  key: number
  /**
   * The directory doctor this row was filled from. Sent so the order (and a monthly plan's later
   * runs) stays tied to that doctor's record; dropped as soon as a field the server would take
   * from the record is edited, since the server would otherwise overwrite the edit.
   */
  recipientId?: string
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  deliveryAddress: string
  dateOfBirth: Date | null
  giftMessage: string
  internalNotes: string
  photo?: File
  /** Units to order, as typed -- validated to a whole number from 1 on submit. */
  quantity: string
  doctor: DoctorFields
  expanded: boolean
  errors: Partial<Record<RowErrorKey, string>>
}

type RowErrorKey = 'recipientName' | 'recipientPhone' | 'deliveryAddress' | 'photoOrEmail' | 'quantity' | 'registrationNumber' | 'submit'

interface RecipientPrefill {
  recipientId?: string
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  deliveryAddress?: string
  dateOfBirth?: Date
  doctor?: Partial<DoctorDetails>
}

function prefillFrom(recipient: Recipient | UpcomingBirthday): RecipientPrefill {
  return {
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientPhone: recipient.phone,
    recipientEmail: recipient.email ?? undefined,
    deliveryAddress: recipient.address ?? undefined,
    dateOfBirth: fromDateOnly(recipient.dateOfBirth),
    doctor: 'doctor' in recipient ? recipient.doctor : undefined,
  }
}

let nextRowKey = 1
function emptyRow(expanded = false, prefill?: RecipientPrefill): DraftRecipient {
  return {
    key: nextRowKey++,
    recipientId: prefill?.recipientId,
    recipientName: prefill?.recipientName ?? '',
    recipientPhone: prefill?.recipientPhone ?? '',
    recipientEmail: prefill?.recipientEmail ?? '',
    deliveryAddress: prefill?.deliveryAddress ?? '',
    dateOfBirth: prefill?.dateOfBirth ?? null,
    giftMessage: '',
    internalNotes: '',
    quantity: '1',
    doctor: {
      qualification: prefill?.doctor?.qualification ?? '',
      registrationNumber: prefill?.doctor?.registrationNumber ?? '',
      speciality: prefill?.doctor?.speciality ?? '',
      clinicName: prefill?.doctor?.clinicName ?? '',
    },
    expanded,
    errors: {},
  }
}

function isBlankRow(row: DraftRecipient): boolean {
  return !row.recipientName && !row.recipientPhone && !row.recipientEmail && !row.deliveryAddress
}

function parseQuantity(value: string, min = 1): number | null {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n >= min && n <= MAX_QUANTITY ? n : null
}

/** Fields the server reads from the picked doctor's record instead of the request. */
const RECORD_FIELDS: (keyof DraftRecipient)[] = ['recipientName', 'recipientPhone', 'recipientEmail', 'deliveryAddress', 'dateOfBirth', 'doctor']

/** Only the fields actually filled in -- the server stores an absent one as "not given". */
function doctorInput(doctor: DoctorFields): Partial<DoctorDetails> | undefined {
  const entries = Object.entries(doctor)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}


function RecipientCard({
  row,
  index,
  onUpdate,
  onRemove,
  canRemove,
  photoRequired,
  artworkRequired,
  minQuantity,
}: {
  row: DraftRecipient
  index: number
  onUpdate: (patch: Partial<DraftRecipient>) => void
  onRemove: () => void
  canRemove: boolean
  photoRequired: boolean
  /** The vendor's minimum order, when it is more than one. */
  minQuantity: number
  /** A personalised item (prescription pad): ask for the doctor details it is printed with. */
  artworkRequired: boolean
}) {
  const { t } = useTranslation('gifts')
  const fileInput = useRef<HTMLInputElement>(null)
  const id = (field: string) => `r${row.key}-${field}`
  const setDoctor = (patch: Partial<DoctorFields>) => onUpdate({ doctor: { ...row.doctor, ...patch } })
  const needsPhotoOrEmail = photoRequired && !row.photo && !row.recipientEmail.trim()
  const hasErrors = Object.keys(row.errors).length > 0

  return (
    <section
      aria-label={t('form.recipientN', { n: index + 1 })}
      className={cn('rounded-lg border bg-card shadow-sm', hasErrors && 'border-destructive/50')}
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{t('form.recipientN', { n: index + 1 })}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onUpdate({ expanded: !row.expanded })}>
            {needsPhotoOrEmail && !row.expanded ? (
              <>
                <AlertTriangle className="text-warning" />
                {t('form.photoNeeded')}
              </>
            ) : row.expanded ? (
              <>
                <ChevronUp />
                {t('form.less')}
              </>
            ) : (
              <>
                <ChevronDown />
                {t('form.more')}
              </>
            )}
          </Button>
          <IconButton icon={Trash2} label={t('form.remove')} onClick={onRemove} disabled={!canRemove} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <LabelledField id={id('name')} label={`${t('form.name')} *`} error={row.errors.recipientName}>
          <Input
            id={id('name')}
            value={row.recipientName}
            aria-invalid={Boolean(row.errors.recipientName)}
            onChange={(e) => onUpdate({ recipientName: e.target.value })}
          />
        </LabelledField>
        <LabelledField id={id('phone')} label={`${t('form.phone')} *`} error={row.errors.recipientPhone}>
          <Input
            id={id('phone')}
            type="tel"
            value={row.recipientPhone}
            aria-invalid={Boolean(row.errors.recipientPhone)}
            onChange={(e) => onUpdate({ recipientPhone: e.target.value })}
          />
        </LabelledField>
        <LabelledField id={id('dob')} label={t('form.dob')}>
          <DatePicker id={id('dob')} value={row.dateOfBirth} onChange={(value) => onUpdate({ dateOfBirth: value })} toDate={new Date()} />
        </LabelledField>
        <LabelledField
          id={id('quantity')}
          label={`${t('form.quantity')} *`}
          hint={minQuantity > 1 ? t('form.minQuantity', { min: minQuantity.toLocaleString() }) : undefined}
          error={row.errors.quantity}
        >
          <Input
            id={id('quantity')}
            inputMode="numeric"
            value={row.quantity}
            aria-invalid={Boolean(row.errors.quantity)}
            onChange={(e) => onUpdate({ quantity: e.target.value })}
          />
        </LabelledField>
        <LabelledField id={id('address')} label={`${t('form.address')} *`} error={row.errors.deliveryAddress} className="sm:col-span-2 lg:col-span-4">
          <Input
            id={id('address')}
            value={row.deliveryAddress}
            aria-invalid={Boolean(row.errors.deliveryAddress)}
            onChange={(e) => onUpdate({ deliveryAddress: e.target.value })}
          />
        </LabelledField>

        {artworkRequired && (
          <div className="grid grid-cols-1 gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary sm:col-span-2 lg:col-span-4">
              <Palette className="h-3.5 w-3.5" />
              {t('form.doctorSection')}
            </p>
            <LabelledField id={id('reg')} label={`${t('form.registrationNumber')} *`} error={row.errors.registrationNumber}>
              <Input
                id={id('reg')}
                value={row.doctor.registrationNumber}
                placeholder={t('form.registrationPlaceholder')}
                aria-invalid={Boolean(row.errors.registrationNumber)}
                onChange={(e) => setDoctor({ registrationNumber: e.target.value })}
              />
            </LabelledField>
            <LabelledField id={id('qualification')} label={t('form.qualification')}>
              <Input
                id={id('qualification')}
                value={row.doctor.qualification}
                placeholder={t('form.qualificationPlaceholder')}
                onChange={(e) => setDoctor({ qualification: e.target.value })}
              />
            </LabelledField>
            <LabelledField id={id('speciality')} label={t('form.speciality')}>
              <Input id={id('speciality')} value={row.doctor.speciality} onChange={(e) => setDoctor({ speciality: e.target.value })} />
            </LabelledField>
            <LabelledField id={id('clinic')} label={t('form.clinicName')}>
              <Input id={id('clinic')} value={row.doctor.clinicName} onChange={(e) => setDoctor({ clinicName: e.target.value })} />
            </LabelledField>
          </div>
        )}

        {row.expanded && (
          <>
            <LabelledField
              id={id('email')}
              label={`${t('form.email')} (${photoRequired ? t('form.requiredIfNoPhoto') : t('form.optional')})`}
              hint={t('form.emailHelp')}
              error={row.errors.photoOrEmail}
              className="sm:col-span-1 lg:col-span-2"
            >
              <Input
                id={id('email')}
                type="email"
                value={row.recipientEmail}
                aria-invalid={Boolean(row.errors.photoOrEmail)}
                onChange={(e) => onUpdate({ recipientEmail: e.target.value })}
              />
            </LabelledField>
            <LabelledField
              id={id('photo')}
              label={`${t('form.photo')} (${photoRequired ? t('form.requiredIfNoEmail') : t('form.optional')})`}
              className="sm:col-span-1 lg:col-span-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Button id={id('photo')} type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <Camera />
                  {row.photo ? t('form.changePhoto') : t('form.choosePhoto')}
                </Button>
                {row.photo && <span className="truncate text-xs text-muted-foreground">{row.photo.name}</span>}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid={id('photo-input')}
                  onChange={(e) => e.target.files?.[0] && onUpdate({ photo: e.target.files[0] })}
                />
              </div>
            </LabelledField>
            <LabelledField id={id('message')} label={t('form.message')} className="sm:col-span-1 lg:col-span-2">
              <Textarea
                id={id('message')}
                rows={2}
                value={row.giftMessage}
                placeholder={t('form.messagePlaceholder')}
                onChange={(e) => onUpdate({ giftMessage: e.target.value })}
              />
            </LabelledField>
            <LabelledField id={id('notes')} label={t('form.notes')} className="sm:col-span-1 lg:col-span-2">
              <Textarea
                id={id('notes')}
                rows={2}
                value={row.internalNotes}
                placeholder={t('form.notesPlaceholder')}
                onChange={(e) => onUpdate({ internalNotes: e.target.value })}
              />
            </LabelledField>
          </>
        )}

        {row.errors.submit && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-4">
            {row.errors.submit}
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * Send one gift to as many recipients as needed. Each recipient becomes its own request -- or,
 * when the company orders directly from vendors, its own order with the gift's vendor.
 */
export function QuickGiftFormPage() {
  const { t } = useTranslation('gifts')
  const { giftId } = useParams<{ giftId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { prefillRecipient } = (location.state as { prefillRecipient?: Recipient | UpcomingBirthday } | null) ?? {}
  const { data: gifts, isLoading } = useActiveGifts()
  const gift = gifts?.find((g) => g.id === giftId)
  const createRequest = useCreateQuickGiftRequest()
  const createPlan = useCreateRecurringOrderPlan()

  // Each recipient becomes a monthly plan: this order now, then the same one every month.
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [rows, setRows] = useState<DraftRecipient[]>([emptyRow(true, prefillRecipient ? prefillFrom(prefillRecipient) : undefined)])
  const [submitting, setSubmitting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Expanded up front when the gift needs more than the basics, so the extra fields are seen, not found by failing.
  const startExpanded = Boolean(gift?.photoRequired)
  // The vendor's minimum order; the server refuses anything below it too.
  const minQuantity = gift?.moq ?? 1

  function updateRow(key: number, patch: Partial<DraftRecipient>) {
    const unlinks = RECORD_FIELDS.some((field) => field in patch)
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, ...(unlinks && { recipientId: undefined }), errors: {} } : r)))
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  /** If the only row is still untouched, the picked recipients replace it instead of leaving a stray blank one. */
  function handlePick(picked: Recipient[]) {
    setPickerOpen(false)
    if (picked.length === 0) return
    setRows((prev) => {
      const base = prev.length === 1 && isBlankRow(prev[0]) ? [] : prev
      return [...base, ...picked.map((r) => emptyRow(startExpanded, prefillFrom(r)))]
    })
  }

  function validate(row: DraftRecipient): DraftRecipient['errors'] {
    if (!gift) return {}
    const errors: DraftRecipient['errors'] = {}
    const required = t('form.error.required')
    if (!row.recipientName.trim()) errors.recipientName = required
    if (!row.recipientPhone.trim()) errors.recipientPhone = required
    if (!row.deliveryAddress.trim()) errors.deliveryAddress = required
    if (gift.photoRequired && !row.photo && !row.recipientEmail.trim()) errors.photoOrEmail = t('form.error.photoOrEmail')
    if (parseQuantity(row.quantity, minQuantity) === null) {
      errors.quantity = t('form.error.quantity', { min: minQuantity.toLocaleString(), max: MAX_QUANTITY.toLocaleString() })
    }
    // A printed prescription pad has to carry the doctor's registration number.
    if (gift.artworkRequired && !row.doctor.registrationNumber.trim()) errors.registrationNumber = t('form.error.registrationNumber')
    return errors
  }

  async function onSubmitAll() {
    if (!gift) return
    const validated = rows.map((row) => ({ row, errors: validate(row) }))
    if (validated.some((v) => Object.keys(v.errors).length > 0)) {
      setRows(validated.map(({ row, errors }) => ({ ...row, errors, expanded: row.expanded || Boolean(errors.photoOrEmail) })))
      toast.error(t('form.error.fixRows'))
      return
    }

    setSubmitting(true)
    const succeeded: number[] = []
    let placedAsOrders = 0
    const failures = new Map<number, string>()

    for (const row of rows) {
      try {
        let photo: QuickGiftPhotoValue | undefined
        if (row.photo) photo = await uploadQuickGiftPhoto(row.photo)
        const input = {
          giftId: gift.id,
          recipientId: row.recipientId,
          recipientName: row.recipientName.trim(),
          recipientPhone: row.recipientPhone.trim(),
          recipientEmail: row.recipientEmail.trim() || undefined,
          deliveryAddress: row.deliveryAddress.trim(),
          recipientDob: toDateOnly(row.dateOfBirth) ?? undefined,
          giftMessage: row.giftMessage.trim() || undefined,
          internalNotes: row.internalNotes.trim() || undefined,
          photo,
          doctor: gift.artworkRequired ? doctorInput(row.doctor) : undefined,
          quantity: parseQuantity(row.quantity, minQuantity) ?? minQuantity,
        }
        if (repeatMonthly) {
          await createPlan.mutateAsync(input)
        } else {
          const created = await createRequest.mutateAsync(input)
          // Direct vendor ordering approves on creation -- the order already went to the vendor.
          if (created.orderId) placedAsOrders++
        }
        succeeded.push(row.key)
      } catch (err) {
        failures.set(row.key, err instanceof Error ? err.message : t('form.error.nothingSent'))
      }
    }
    setSubmitting(false)

    if (failures.size === 0) {
      const count = succeeded.length
      if (repeatMonthly) {
        toast.success(t('form.success.monthlySetUp', { count }), { description: t('form.success.monthlySetUpDetail') })
      } else if (placedAsOrders === count) {
        toast.success(t('form.success.orderPlaced', { count }), {
          description: t('form.success.orderPlacedDetail', { vendor: gift.vendorName ?? t('form.success.theVendor') }),
        })
      } else {
        toast.success(t('form.success.requestSent', { count }), { description: t('form.success.requestSentDetail') })
      }
      navigate('/quick-gift', repeatMonthly ? { state: { tab: 'monthly' } } : undefined)
      return
    }

    setRows((prev) =>
      prev
        .filter((r) => !succeeded.includes(r.key))
        .map((r) => (failures.has(r.key) ? { ...r, errors: { submit: failures.get(r.key) } } : r)),
    )
    toast.error(succeeded.length > 0 ? t('form.error.partial', { ok: succeeded.length, failed: failures.size }) : t('form.error.nothingSent'))
  }

  if (isLoading) return <FormSkeleton fieldCount={6} />

  if (!gift) {
    return (
      <EmptyState
        icon={GiftIcon}
        title={t('form.notAvailableTitle')}
        description={t('form.notAvailableBody')}
        action={{ label: t('landing.title'), to: '/quick-gift', icon: ArrowLeft }}
      />
    )
  }

  return (
    <div className="frame-free">
      <MasterPageHeader
        lead={<GiftThumbnail gift={gift} size={40} />}
        title={t('form.title', { gift: gift.name })}
        description={t('form.subtitle')}
        extra={
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/quick-gift">
              <ArrowLeft />
              {t('landing.title')}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {gift.vendorName && <Badge variant="secondary-soft">{t('form.suppliedBy', { vendor: gift.vendorName })}</Badge>}
        {gift.artworkRequired && (
          <Badge variant="primary-soft" className="gap-1">
            <Palette className="h-3 w-3" />
            {t('form.personalisedNote')}
          </Badge>
        )}
        {gift.photoRequired && (
          <Badge variant="warning-soft" className="gap-1">
            <Camera className="h-3 w-3" />
            {t('form.photoNote')}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <RecipientCard
            key={row.key}
            row={row}
            index={index}
            onUpdate={(patch) => updateRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
            canRemove={rows.length > 1}
            photoRequired={gift.photoRequired}
            artworkRequired={gift.artworkRequired}
            minQuantity={minQuantity}
          />
        ))}
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button variant="outline" onClick={() => setRows((prev) => [...prev, emptyRow(startExpanded)])}>
          <Plus />
          {t('form.addRecipient')}
        </Button>
        <Button variant="outline" onClick={() => setPickerOpen(true)}>
          <Contact />
          {t('form.browse')}
        </Button>
        <label htmlFor="repeat-monthly" className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox id="repeat-monthly" checked={repeatMonthly} onCheckedChange={(checked) => setRepeatMonthly(checked === true)} />
          {t('form.repeatMonthly')}
        </label>
        <Button loading={submitting} onClick={() => void onSubmitAll()}>
          <Send />
          {rows.length > 1 ? t('form.sendAll', { count: rows.length }) : t('form.send')}
        </Button>
      </div>

      <RecipientPickerDialog visible={pickerOpen} onHide={() => setPickerOpen(false)} onConfirm={handlePick} />
    </div>
  )
}
