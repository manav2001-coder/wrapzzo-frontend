import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Checkbox } from 'primereact/checkbox'
import { confirmDialog } from 'primereact/confirmdialog'
import { FileUpload } from 'primereact/fileupload'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { uploadVendorGiftImage } from '@/api/vendorGifts'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { useCreateVendorGift, useDeleteVendorGiftImage, useUpdateVendorGift, useUploadVendorGiftImage, useVendorGift } from '@/hooks/useVendorGifts'
import { formatCurrency } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

// Mirrors the admin gift form's cap -- see MAX_GIFT_IMAGES there for why.
const MAX_GIFT_IMAGES = 1

const giftSchema = z
  .object({
    name: z.string().min(1, 'Gift name is required'),
    category: z.string().min(1, 'Category is required'),
    description: z.string().optional(),
    moq: z.number().positive().optional().nullable(),
    leadTimeDays: z.number().positive().optional().nullable(),
    price: z.number().min(0, 'Price must be zero or more').nullable(),
    markupFeePercentage: z.number().min(0).optional().nullable(),
    commissionFeePercentage: z.number().min(0).optional().nullable(),
    photoRequired: z.boolean(),
    artworkRequired: z.boolean(),
  })
  .refine((data) => data.price !== null, { message: 'Price is required', path: ['price'] })

type GiftFormValues = z.infer<typeof giftSchema>

export function VendorGiftFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: gift, isLoading: isLoadingGift } = useVendorGift(id)
  const createGift = useCreateVendorGift()
  const updateGift = useUpdateVendorGift(id ?? '')
  const uploadImage = useUploadVendorGiftImage(id ?? '')
  const deleteImage = useDeleteVendorGiftImage(id ?? '')

  // Create mode only -- staged locally since a gift needs to exist (an id)
  // before the backend's presign/attach endpoints have anywhere to point.
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isUploadingPending, setIsUploadingPending] = useState(false)
  const pendingPreviews = useMemo(() => pendingFiles.map((file) => URL.createObjectURL(file)), [pendingFiles])
  useEffect(() => {
    return () => pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
  }, [pendingPreviews])

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<GiftFormValues>({
    resolver: zodResolver(giftSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      moq: null,
      leadTimeDays: null,
      price: null,
      markupFeePercentage: null,
      commissionFeePercentage: null,
      photoRequired: false,
      artworkRequired: false,
    },
  })

  const [price, markupFeePercentage, commissionFeePercentage] = watch(['price', 'markupFeePercentage', 'commissionFeePercentage'])
  const totalPrice = useMemo(() => {
    if (price == null) return null
    const markup = (price * (markupFeePercentage ?? 0)) / 100
    const commission = (price * (commissionFeePercentage ?? 0)) / 100
    return price + markup + commission
  }, [price, markupFeePercentage, commissionFeePercentage])

  useEffect(() => {
    if (gift) {
      reset({
        name: gift.name,
        category: gift.category,
        description: gift.description ?? '',
        moq: gift.moq,
        leadTimeDays: gift.leadTimeDays,
        price: gift.price,
        markupFeePercentage: gift.markupFeePercentage,
        commissionFeePercentage: gift.commissionFeePercentage,
        photoRequired: gift.photoRequired,
        artworkRequired: gift.artworkRequired,
      })
    }
  }, [gift, reset])

  async function onSubmit(values: GiftFormValues) {
    const input = {
      name: values.name,
      category: values.category,
      description: values.description || undefined,
      moq: values.moq ?? undefined,
      leadTimeDays: values.leadTimeDays ?? undefined,
      // Validated non-null by the schema's refine before onSubmit can ever fire.
      price: values.price ?? 0,
      markupFeePercentage: values.markupFeePercentage ?? undefined,
      commissionFeePercentage: values.commissionFeePercentage ?? undefined,
      photoRequired: values.photoRequired,
      artworkRequired: values.artworkRequired,
    }
    try {
      if (isEdit && id) {
        await updateGift.mutateAsync(input)
        showToast({ severity: 'success', summary: 'Gift updated' })
        return
      }

      const created = await createGift.mutateAsync(input)

      if (pendingFiles.length > 0) {
        setIsUploadingPending(true)
        try {
          for (let index = 0; index < pendingFiles.length; index += 1) {
            await uploadVendorGiftImage(created.id, pendingFiles[index], index)
          }
        } catch (error) {
          showApiError(error, 'Gift submitted, but one or more images failed to upload. Add them from the gift page.')
          navigate(`/vendor/gifts/${created.id}`, { replace: true })
          return
        } finally {
          setIsUploadingPending(false)
        }
      }

      showToast({ severity: 'success', summary: 'Gift submitted to the catalogue' })
      navigate(`/vendor/gifts/${created.id}`, { replace: true })
    } catch (error) {
      showApiError(error)
    }
  }

  async function handleImageUpload(event: { files: File[] }) {
    const file = event.files[0]
    if (!file || !gift) return
    try {
      await uploadImage.mutateAsync({ file, displayOrder: gift.images.length })
      showToast({ severity: 'success', summary: 'Image added' })
    } catch (error) {
      showApiError(error)
    }
  }

  function handleStageFile(event: { files: File[] }) {
    const file = event.files[0]
    if (!file) return
    setPendingFiles((prev) => (prev.length >= MAX_GIFT_IMAGES ? prev : [...prev, file]))
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function confirmRemoveImage(imageId: string) {
    confirmDialog({
      header: 'Remove image',
      message: 'This image will be removed from the gift.',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteImage.mutateAsync(imageId)
          showToast({ severity: 'success', summary: 'Image removed' })
        } catch (error) {
          showApiError(error)
        }
      },
    })
  }

  if (isEdit && isLoadingGift) {
    return (
      <div className="flex justify-center py-20">
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="4" />
      </div>
    )
  }

  const submitting = createGift.isPending || updateGift.isPending || isUploadingPending
  const existingImageCount = isEdit && gift ? gift.images.length : pendingFiles.length
  const atImageCap = existingImageCount >= MAX_GIFT_IMAGES

  return (
    <div>
      <PageHeader
        title={isEdit ? gift?.name ?? 'Gift' : 'Add gift'}
        subtitle={isEdit ? 'Update your gift details.' : 'Submit a new gift to the Wrapzzo catalogue.'}
        backTo="/vendor/gifts"
        actions={
          isEdit && gift ? (
            <StatusBadge status={gift.active ? 'ACTIVE' : 'INACTIVE'} label={gift.active ? 'Listed' : 'Delisted by Wrapzzo'} />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card title="Gift details" className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Gift name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <InputText id="name" {...field} className={errors.name ? 'p-invalid' : ''} placeholder="Premium Diary Set" />
                )}
              />
              {errors.name && <small className="text-red-500 dark:text-red-400">{errors.name.message}</small>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-text">
                Category
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <InputText id="category" {...field} className={errors.category ? 'p-invalid' : ''} placeholder="Stationery" />
                )}
              />
              {errors.category && <small className="text-red-500 dark:text-red-400">{errors.category.message}</small>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-text">
                Description
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputTextarea id="description" {...field} rows={3} placeholder="Optional" className="w-full" />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="moq" className="text-sm font-medium text-text">
                  MOQ
                </label>
                <Controller
                  name="moq"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId="moq"
                      value={field.value ?? null}
                      onValueChange={(event) => field.onChange(event.value)}
                      min={1}
                      placeholder="Optional"
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="leadTimeDays" className="text-sm font-medium text-text">
                  Lead time (days)
                </label>
                <Controller
                  name="leadTimeDays"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId="leadTimeDays"
                      value={field.value ?? null}
                      onValueChange={(event) => field.onChange(event.value)}
                      min={1}
                      placeholder="Optional"
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="price" className="text-sm font-medium text-text">
                  Price
                </label>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId="price"
                      value={field.value ?? null}
                      onValueChange={(event) => field.onChange(event.value)}
                      mode="currency"
                      currency="INR"
                      locale="en-IN"
                      min={0}
                      placeholder="0.00"
                      className={errors.price ? 'p-invalid w-full' : 'w-full'}
                    />
                  )}
                />
                {errors.price && <small className="text-red-500 dark:text-red-400">{errors.price.message}</small>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="markupFeePercentage" className="text-sm font-medium text-text">
                  Markup fee %
                </label>
                <Controller
                  name="markupFeePercentage"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId="markupFeePercentage"
                      value={field.value ?? null}
                      onValueChange={(event) => field.onChange(event.value)}
                      mode="decimal"
                      minFractionDigits={0}
                      maxFractionDigits={2}
                      suffix="%"
                      min={0}
                      placeholder="0"
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="commissionFeePercentage" className="text-sm font-medium text-text">
                  Commission fee %
                </label>
                <Controller
                  name="commissionFeePercentage"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId="commissionFeePercentage"
                      value={field.value ?? null}
                      onValueChange={(event) => field.onChange(event.value)}
                      mode="decimal"
                      minFractionDigits={0}
                      maxFractionDigits={2}
                      suffix="%"
                      min={0}
                      placeholder="0"
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3.5 py-2.5">
              <Controller
                name="photoRequired"
                control={control}
                render={({ field }) => (
                  <Checkbox inputId="photoRequired" checked={field.value} onChange={(e) => field.onChange(e.checked)} />
                )}
              />
              <label htmlFor="photoRequired" className="text-sm text-text">
                <span className="font-medium">Require a recipient photo for this gift</span>
                <p className="mt-0.5 text-xs text-text-muted">
                  When ordering it, the sender must upload a photo up front or provide the recipient's email so we can send them an
                  upload link.
                </p>
              </label>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3.5 py-2.5">
              <Controller
                name="artworkRequired"
                control={control}
                render={({ field }) => (
                  <Checkbox inputId="artworkRequired" checked={field.value} onChange={(e) => field.onChange(e.checked)} />
                )}
              />
              <label htmlFor="artworkRequired" className="text-sm text-text">
                <span className="font-medium">Needs artwork approval before dispatch</span>
                <p className="mt-0.5 text-xs text-text-muted">
                  For personalised items such as prescription pads: upload a proof on each order, and you can dispatch it only once
                  the person who ordered approves one.
                </p>
              </label>
            </div>

            {totalPrice != null && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3.5 py-2.5">
                <span className="text-sm text-text-muted">Total price shown to companies</span>
                <span className="text-base font-semibold text-text">{formatCurrency(totalPrice)}</span>
              </div>
            )}

            {isEdit && gift && !gift.active && (
              <p className="text-xs text-amber-500">
                Wrapzzo has delisted this gift from the catalogue. You can still edit it, but it stays hidden until relisted.
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                label={isEdit ? 'Save changes' : isUploadingPending ? 'Uploading images...' : 'Submit gift'}
                loading={submitting}
                disabled={isEdit && !isDirty}
              />
            </div>
          </form>
        </Card>

        <Card
          title="Images"
          subTitle={`${existingImageCount} of ${MAX_GIFT_IMAGES} used${isEdit ? '' : '. Optional — add now or after submitting.'}`}
          className="lg:col-span-1"
        >
          <div className="flex flex-wrap gap-3">
            {isEdit && gift ? (
              <>
                {[...gift.images]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((image) => (
                    <div key={image.id} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                      <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => confirmRemoveImage(image.id)}
                        aria-label="Remove image"
                        className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <i className="pi pi-times text-[10px]" />
                      </button>
                    </div>
                  ))}

                {!atImageCap && (
                  <FileUpload
                    mode="basic"
                    name="image"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    maxFileSize={5_000_000}
                    customUpload
                    uploadHandler={handleImageUpload}
                    auto
                    chooseLabel={uploadImage.isPending ? 'Uploading...' : 'Add image'}
                    disabled={uploadImage.isPending}
                  />
                )}
              </>
            ) : (
              <>
                {pendingFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                    <img src={pendingPreviews[index]} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      aria-label="Remove image"
                      className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <i className="pi pi-times text-[10px]" />
                    </button>
                  </div>
                ))}

                {!atImageCap && (
                  <FileUpload
                    key={pendingFiles.length}
                    mode="basic"
                    name="image"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    maxFileSize={5_000_000}
                    chooseLabel="Add image"
                    onSelect={handleStageFile}
                    disabled={submitting}
                  />
                )}
              </>
            )}
          </div>
          {atImageCap && <p className="mt-3 text-xs text-text-muted">Maximum of {MAX_GIFT_IMAGES} images reached.</p>}
        </Card>
      </div>
    </div>
  )
}
