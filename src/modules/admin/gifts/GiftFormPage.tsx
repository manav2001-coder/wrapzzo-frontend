import { ArrowLeft, Power, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { z } from 'zod'

import { uploadGiftImage, type GiftInput } from '@/api/gifts'
import { AppDialog } from '@/components/app-dialog'
import { FormGenerator } from '@/components/fields/form-generator'
import { FileDropzone } from '@/components/file-dropzone'
import { IconButton } from '@/components/icon-button'
import { decimalField, numberField, selectField, switchField, textField } from '@/components/masters/master-fields'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateGift, useDeleteGiftImage, useGift, useGifts, useSetGiftStatus, useUpdateGift, useUploadGiftImage } from '@/hooks/useGifts'
import { formatCurrency } from '@/lib/format'
import { GiftThumbnail } from './GiftThumbnail'

/** One image per gift for now -- raise this (and bring back a carousel in the Gift Store) to allow more. */
export const MAX_GIFT_IMAGES = 1

/** A starting set; every category a gift already uses joins it, so a new "Other" becomes a real option. */
const FIXED_CATEGORIES = [
  'Drinkware',
  'Stationery & Desk',
  'Wellness',
  'Travel & Lifestyle',
  'Corporate Gifting',
  'Writing Instruments',
  'Home & Living',
  'Apparel',
  'Electronics',
  'Food & Beverages',
]
const OTHER = '__other__'
const IMAGE_ACCEPT = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'image/svg+xml': ['.svg'] }

const num = (value: unknown) => (value === '' || value == null ? undefined : Number(value))
const asString = (value: number | null | undefined) => (value == null ? '' : String(value))

/** price + price × markup% + price × commission%, as the backend computes it. */
function totalOf(values: Record<string, unknown>): number | null {
  const price = num(values.price)
  if (price === undefined || Number.isNaN(price)) return null
  const markup = num(values.markupFeePercentage) ?? 0
  const commission = num(values.commissionFeePercentage) ?? 0
  return price + (price * markup) / 100 + (price * commission) / 100
}

export function GiftFormPage() {
  const { t } = useTranslation('admin')
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const showError = useApiErrorToast()

  const { data: gift, isLoading } = useGift(id)
  const { data: allGifts } = useGifts()
  const createGift = useCreateGift()
  const updateGift = useUpdateGift(id ?? '')
  const setStatus = useSetGiftStatus()
  const uploadImage = useUploadGiftImage(id ?? '')
  const deleteImage = useDeleteGiftImage(id ?? '')
  const [confirmingStatus, setConfirmingStatus] = useState(false)
  const [total, setTotal] = useState<number | null>(null)

  // Create mode: the image is held until the gift exists, then uploaded right after the create.
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const pendingPreview = useMemo(() => (pendingImage ? URL.createObjectURL(pendingImage) : null), [pendingImage])
  useEffect(() => () => void (pendingPreview && URL.revokeObjectURL(pendingPreview)), [pendingPreview])

  // A vendor's own submission: the backend refuses edits to its content, so the form is read-only.
  const vendorOwned = Boolean(gift?.vendorId)

  const categories = useMemo(() => {
    const set = new Set(FIXED_CATEGORIES)
    for (const g of allGifts ?? []) if (g.category) set.add(g.category)
    return [...set].sort()
  }, [allGifts])

  const fields = useMemo(
    () => [
      textField({ id: 'name', label: t('gifts.detail.name'), required: true, spanToFullRow: true }),
      selectField({
        id: 'category',
        label: t('gifts.detail.category'),
        required: true,
        options: [...categories.map((value) => ({ value, label: value })), { value: OTHER, label: t('gifts.detail.otherOption') }],
      }),
      textField({
        id: 'otherCategory',
        label: t('gifts.detail.otherCategory'),
        max: 150,
        hidden: (values) => values.category !== OTHER,
      }),
      textField({ id: 'description', label: t('gifts.detail.description'), multiline: true, max: 2000, spanToFullRow: true }),
      numberField({ id: 'moq', label: t('gifts.detail.moq'), min: 1, max: 1_000_000 }),
      numberField({ id: 'leadTimeDays', label: t('gifts.detail.leadTime'), min: 1, max: 365 }),
      decimalField({ id: 'price', label: t('gifts.detail.price'), required: true, max: 10_000_000, scale: 2 }),
      decimalField({ id: 'markupFeePercentage', label: t('gifts.detail.markup'), max: 100, scale: 2 }),
      decimalField({ id: 'commissionFeePercentage', label: t('gifts.detail.commission'), max: 100, scale: 2 }),
      switchField({
        id: 'photoRequired',
        label: t('gifts.detail.photoRequired'),
        description: t('gifts.detail.photoRequiredHelp'),
      }),
      switchField({
        id: 'artworkRequired',
        label: t('gifts.detail.artworkRequired'),
        description: t('gifts.detail.artworkRequiredHelp'),
      }),
    ],
    [t, categories],
  )

  const values = useMemo(
    () =>
      gift
        ? {
            name: gift.name,
            category: gift.category,
            description: gift.description ?? '',
            moq: gift.moq ?? '',
            leadTimeDays: gift.leadTimeDays ?? '',
            price: asString(gift.price),
            markupFeePercentage: asString(gift.markupFeePercentage),
            commissionFeePercentage: asString(gift.commissionFeePercentage),
            photoRequired: gift.photoRequired,
            artworkRequired: gift.artworkRequired,
          }
        : undefined,
    [gift],
  )

  const refine = useMemo(
    () => (submitted: Record<string, unknown>, ctx: z.RefinementCtx) => {
      if (submitted.category === OTHER && !String(submitted.otherCategory ?? '').trim()) {
        ctx.addIssue({ code: 'custom', path: ['otherCategory'], message: t('errors.required', { ns: 'common' }) })
      }
    },
    [t],
  )

  async function onSubmit(submitted: Record<string, unknown>) {
    const input: GiftInput = {
      name: String(submitted.name).trim(),
      category: submitted.category === OTHER ? String(submitted.otherCategory).trim() : String(submitted.category),
      description: String(submitted.description ?? '').trim() || undefined,
      moq: num(submitted.moq),
      leadTimeDays: num(submitted.leadTimeDays),
      price: Number(submitted.price),
      markupFeePercentage: num(submitted.markupFeePercentage),
      commissionFeePercentage: num(submitted.commissionFeePercentage),
      photoRequired: Boolean(submitted.photoRequired),
      artworkRequired: Boolean(submitted.artworkRequired),
    }
    try {
      if (isEdit) {
        await updateGift.mutateAsync(input)
        toast.success(t('gifts.detail.updated'))
        return
      }
      const created = await createGift.mutateAsync(input)
      if (pendingImage) {
        try {
          await uploadGiftImage(created.id, pendingImage, 0)
        } catch {
          toast.error(t('gifts.detail.imageFailedAfterCreate'))
        }
      }
      toast.success(t('gifts.detail.created'))
      navigate(`/admin/gifts/${created.id}`, { replace: true })
    } catch (error) {
      showError(error)
    }
  }

  async function onImagePicked(file: File | null) {
    if (!file) return
    if (!isEdit) {
      setPendingImage(file)
      return
    }
    try {
      await uploadImage.mutateAsync({ file, displayOrder: gift?.images.length ?? 0 })
      toast.success(t('gifts.detail.imageAdded'))
    } catch (error) {
      showError(error)
    }
  }

  async function removeImage(imageId: string) {
    try {
      await deleteImage.mutateAsync(imageId)
      toast.success(t('gifts.detail.imageRemoved'))
    } catch (error) {
      showError(error)
    }
  }

  async function confirmStatus() {
    if (!gift) return
    try {
      await setStatus.mutateAsync({ id: gift.id, active: !gift.active })
      toast.success(gift.active ? t('gifts.markedOut') : t('gifts.markedIn'))
    } catch (error) {
      showError(error)
    } finally {
      setConfirmingStatus(false)
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const images = [...(gift?.images ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)
  const atCap = isEdit ? images.length >= MAX_GIFT_IMAGES : Boolean(pendingImage)
  const shownTotal = total ?? gift?.totalPrice ?? null

  return (
    <div className="space-y-6">
      <MasterPageHeader
        lead={
          <>
            <IconButton icon={ArrowLeft} label={t('gifts.detail.back')} onClick={() => navigate('/admin/gifts')} />
            {gift && <GiftThumbnail gift={gift} />}
          </>
        }
        title={isEdit ? (gift?.name ?? '') : t('gifts.detail.newTitle')}
        description={
          vendorOwned
            ? t('gifts.detail.vendorOwned', { vendor: gift?.vendorName })
            : isEdit
              ? t('gifts.detail.editSubtitle')
              : t('gifts.detail.newSubtitle')
        }
        extra={
          gift && (
            <div className="flex items-center gap-2">
              <StatusCell active={gift.active} label={gift.active ? t('gifts.inStock') : t('gifts.outOfStock')} />
              <Button size="sm" variant={gift.active ? 'outline' : 'default'} onClick={() => setConfirmingStatus(true)}>
                {gift.active ? <Power /> : <RotateCcw />}
                {gift.active ? t('gifts.markOut') : t('gifts.markIn')}
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 pb-4 lg:grid-cols-3">
        <SectionCard
          title={t('gifts.detail.details')}
          className="lg:col-span-2"
          footer={
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('gifts.detail.total')}</span>
              <span className="text-base font-semibold">{formatCurrency(shownTotal)}</span>
            </div>
          }
        >
          <FormGenerator
            fields={fields}
            values={values}
            mode={vendorOwned ? 'view' : isEdit ? 'edit' : 'create'}
            maxWidgetsPerRow={2}
            refine={refine}
            submitPermission="gift.manage"
            submitLabel={isEdit ? t('gifts.detail.save') : t('gifts.detail.create')}
            onChange={(live) => setTotal(totalOf(live))}
            onSubmit={onSubmit}
            hideCardWrapper
          />
        </SectionCard>

        <SectionCard title={t('gifts.detail.image')} description={isEdit ? t('gifts.detail.imageHelp') : t('gifts.detail.imageHelpNew')}>
          <div className="space-y-4">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <img src={image.imageUrl} alt="" className="aspect-square w-full rounded-md border object-cover" />
                {!vendorOwned && (
                  <IconButton
                    icon={Trash2}
                    tone="destructive"
                    label={t('gifts.detail.removeImage')}
                    className="absolute right-2 top-2 bg-background/90"
                    onClick={() => void removeImage(image.id)}
                  />
                )}
              </div>
            ))}
            {!isEdit && pendingPreview && (
              <img src={pendingPreview} alt="" className="aspect-square w-full rounded-md border object-cover" />
            )}
            {!vendorOwned && (!atCap || !isEdit) && (
              <FileDropzone
                file={isEdit ? null : pendingImage}
                onChange={(file) => (file ? void onImagePicked(file) : setPendingImage(null))}
                accept={IMAGE_ACCEPT}
                disabled={uploadImage.isPending}
                prompt={t('gifts.detail.imageDrop')}
              />
            )}
          </div>
        </SectionCard>
      </div>

      {gift && (
        <AppDialog
          open={confirmingStatus}
          onOpenChange={setConfirmingStatus}
          size="sm"
          title={gift.active ? t('gifts.outTitle') : t('gifts.markIn')}
          description={gift.active ? t('gifts.outBody') : undefined}
          confirmLabel={gift.active ? t('gifts.markOut') : t('gifts.markIn')}
          cancelLabel={t('action.cancel', { ns: 'common' })}
          confirmVariant={gift.active ? 'destructive' : 'default'}
          loading={setStatus.isPending}
          onConfirm={confirmStatus}
        />
      )}
    </div>
  )
}
