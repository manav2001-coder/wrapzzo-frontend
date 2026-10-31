import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { uploadVendorGiftImage } from '@/api/vendorGifts'
import { FormGenerator } from '@/components/fields/form-generator'
import { FileDropzone } from '@/components/file-dropzone'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import {
  useCreateVendorGift,
  useDeleteVendorGiftImage,
  useUpdateVendorGift,
  useUploadVendorGiftImage,
  useVendorGift,
  useVendorGifts,
} from '@/hooks/useVendorGifts'
import { formatCurrency } from '@/lib/format'
import { GIFT_IMAGE_ACCEPT, MAX_GIFT_IMAGES, useGiftFormModel } from '@/modules/admin/gifts/gift-form-model'
import { GiftThumbnail } from '@/modules/admin/gifts/GiftThumbnail'

/**
 * A vendor adds or edits one of their own products -- the same form the admin catalogue uses,
 * minus Wrappzo's fees, which stay as Wrappzo set them.
 */
export function VendorGiftFormPage() {
  const { t } = useTranslation('vendor')
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const showError = useApiErrorToast()

  const { data: gift, isLoading } = useVendorGift(id)
  const { data: allGifts } = useVendorGifts()
  const createGift = useCreateVendorGift()
  const updateGift = useUpdateVendorGift(id ?? '')
  const uploadImage = useUploadVendorGiftImage(id ?? '')
  const deleteImage = useDeleteVendorGiftImage(id ?? '')
  const [price, setPrice] = useState<number | null>(null)

  // Create mode: the image is held until the gift exists, then uploaded right after the create.
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [removingImageId, setRemovingImageId] = useState<string | null>(null)
  const pendingPreview = useMemo(() => (pendingImage ? URL.createObjectURL(pendingImage) : null), [pendingImage])
  useEffect(() => () => void (pendingPreview && URL.revokeObjectURL(pendingPreview)), [pendingPreview])

  const knownCategories = useMemo(() => (allGifts ?? []).map((g) => g.category), [allGifts])
  const { fields, values, refine, toInput } = useGiftFormModel({ gift, knownCategories, withFees: false })

  async function onSubmit(submitted: Record<string, unknown>) {
    const input = toInput(submitted)
    try {
      if (isEdit) {
        await updateGift.mutateAsync(input)
        toast.success(t('gifts.form.updated'))
        return
      }
      const created = await createGift.mutateAsync(input)
      if (pendingImage) {
        try {
          await uploadVendorGiftImage(created.id, pendingImage, 0)
        } catch (error) {
          showError(error, t('gifts.form.imageFailed'))
        }
      }
      toast.success(t('gifts.form.created'))
      navigate(`/vendor/gifts/${created.id}`, { replace: true })
    } catch (err) {
      showError(err)
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
      toast.success(t('gifts.form.imageAdded'))
    } catch (err) {
      showError(err)
    }
  }

  async function removeImage(imageId: string) {
    try {
      await deleteImage.mutateAsync(imageId)
      toast.success(t('gifts.form.imageRemoved'))
    } catch (err) {
      showError(err)
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
  const shownPrice = price ?? gift?.price ?? null

  return (
    <div className="space-y-6">
      <MasterPageHeader
        lead={
          <>
            <IconButton icon={ArrowLeft} label={t('gifts.form.back')} onClick={() => navigate('/vendor/gifts')} />
            {gift && <GiftThumbnail gift={gift} />}
          </>
        }
        title={isEdit ? (gift?.name ?? '') : t('gifts.form.newTitle')}
        description={isEdit ? t('gifts.form.editSubtitle') : t('gifts.form.newSubtitle')}
        extra={gift && <StatusCell active={gift.active} label={gift.active ? t('gifts.live') : t('gifts.hidden')} />}
      />

      {gift && !gift.active && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{t('gifts.hiddenHelp')}</p>}

      <div className="grid grid-cols-1 items-start gap-6 pb-4 lg:grid-cols-3">
        <SectionCard
          title={t('gifts.column.gift')}
          className="lg:col-span-2"
          footer={
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t('gifts.form.priceNote')}</span>
              <span className="text-base font-semibold">{formatCurrency(shownPrice)}</span>
            </div>
          }
        >
          <FormGenerator
            fields={fields}
            values={values}
            mode={isEdit ? 'edit' : 'create'}
            maxWidgetsPerRow={2}
            refine={refine}
            submitLabel={isEdit ? t('action.save', { ns: 'common' }) : t('gifts.add')}
            onChange={(live) => {
              const value = live.price === '' || live.price == null ? null : Number(live.price)
              setPrice(value === null || Number.isNaN(value) ? null : value)
            }}
            onSubmit={onSubmit}
            hideCardWrapper
          />
        </SectionCard>

        <SectionCard title={t('gifts.form.image')} description={isEdit ? t('gifts.form.imageHelp') : t('gifts.form.imageHelpNew')}>
          <div className="space-y-4">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <img src={image.imageUrl} alt="" className="aspect-square w-full rounded-md border object-cover" />
                <IconButton
                  icon={Trash2}
                  tone="destructive"
                  label={t('gifts.form.removeImage')}
                  className="absolute right-2 top-2 bg-background/90"
                  onClick={() => setRemovingImageId(image.id)}
                />
              </div>
            ))}
            {!isEdit && pendingPreview && <img src={pendingPreview} alt="" className="aspect-square w-full rounded-md border object-cover" />}
            {(!atCap || !isEdit) && (
              <FileDropzone
                file={isEdit ? null : pendingImage}
                onChange={(file) => (file ? void onImagePicked(file) : setPendingImage(null))}
                accept={GIFT_IMAGE_ACCEPT}
                disabled={uploadImage.isPending}
                prompt={t('gifts.form.imageDrop')}
              />
            )}
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={removingImageId !== null}
        onOpenChange={(open) => !open && setRemovingImageId(null)}
        title={t('confirmDelete.title', { ns: 'common', name: t('gifts.form.image') })}
        description={t('confirmDelete.body', { ns: 'common' })}
        confirmLabel={t('action.delete', { ns: 'common' })}
        onConfirm={() => (removingImageId ? removeImage(removingImageId) : undefined)}
      />
    </div>
  )
}
