import { ArrowLeft, Power, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { uploadGiftImage } from '@/api/gifts'
import { AppDialog } from '@/components/app-dialog'
import { FormGenerator } from '@/components/fields/form-generator'
import { FileDropzone } from '@/components/file-dropzone'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader, StatusCell } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateGift, useDeleteGiftImage, useGift, useGifts, useSetGiftStatus, useUpdateGift, useUploadGiftImage } from '@/hooks/useGifts'
import { formatCurrency } from '@/lib/format'
import { GIFT_IMAGE_ACCEPT, MAX_GIFT_IMAGES, giftTotalOf, useGiftFormModel } from './gift-form-model'
import { GiftThumbnail } from './GiftThumbnail'
import { P } from '@/lib/permissions'

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

  const knownCategories = useMemo(() => (allGifts ?? []).map((g) => g.category), [allGifts])
  const { fields, values, refine, toInput } = useGiftFormModel({ gift, knownCategories, withFees: true })

  async function onSubmit(submitted: Record<string, unknown>) {
    const input = toInput(submitted)
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
            submitPermission={isEdit ? P.PLATFORM_PRODUCT_EDIT : P.PLATFORM_PRODUCT_CREATE}
            submitLabel={isEdit ? t('gifts.detail.save') : t('gifts.detail.create')}
            onChange={(live) => setTotal(giftTotalOf(live))}
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
                accept={GIFT_IMAGE_ACCEPT}
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
