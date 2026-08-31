import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { confirmDialog } from 'primereact/confirmdialog'
import { Dropdown } from 'primereact/dropdown'
import { FileUpload } from 'primereact/fileupload'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { uploadGiftImage } from '@/api/gifts'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import {
  useCreateGift,
  useDeleteGiftImage,
  useGift,
  useGifts,
  useSetGiftStatus,
  useUpdateGift,
  useUploadGiftImage,
} from '@/hooks/useGifts'
import { formatCurrency } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'

// Only one image per gift for now -- raise this (and reintroduce a carousel
// in the Gift Store grid) if multi-image support is turned back on later.
export const MAX_GIFT_IMAGES = 1

/** A sane starting set -- the real list grows over time as admins add "Other" categories, which then show up here too. */
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

const OTHER_OPTION = '__other__'

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
  })
  .refine((data) => data.price !== null, { message: 'Price is required', path: ['price'] })

type GiftFormValues = z.infer<typeof giftSchema>

export function GiftFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: gift, isLoading: isLoadingGift } = useGift(id)
  const { data: allGifts } = useGifts()
  const createGift = useCreateGift()
  const updateGift = useUpdateGift(id ?? '')
  const setStatus = useSetGiftStatus(id ?? '')
  const uploadImage = useUploadGiftImage(id ?? '')
  const deleteImage = useDeleteGiftImage(id ?? '')

  // A vendor-submitted gift's content is theirs -- an admin can only view it and delist it.
  const isVendorOwned = isEdit && Boolean(gift?.vendorId)

  // Create mode only -- staged locally since a gift needs to exist (an id)
  // before the backend's presign/attach endpoints have anywhere to point.
  // Uploaded for real right after the gift record is created.
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
      })
    }
  }, [gift, reset])

  // The fixed starting set, plus every category any gift already uses -- so once someone
  // picks "Other" and types a new one, it's a real option for everyone from then on.
  const knownCategories = useMemo(() => {
    const set = new Set(FIXED_CATEGORIES)
    ;(allGifts ?? []).forEach((g) => {
      if (g.category) set.add(g.category)
    })
    return Array.from(set).sort()
  }, [allGifts])

  // Dropdown selection is separate from the actual category value being submitted: it's
  // either one of the known categories, or the OTHER_OPTION sentinel while a custom one is
  // being typed into the field revealed below.
  const [categorySelect, setCategorySelect] = useState<string>('')
  useEffect(() => {
    if (!gift) return
    setCategorySelect(knownCategories.includes(gift.category) ? gift.category : OTHER_OPTION)
    // Only re-derive when the gift itself (re)loads -- not on every knownCategories recompute,
    // which would fight the admin's own in-progress "Other" selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gift])

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
            await uploadGiftImage(created.id, pendingFiles[index], index)
          }
        } catch (error) {
          showApiError(error, 'Gift created, but one or more images failed to upload. Add them from the gift page.')
          navigate(`/admin/gifts/${created.id}`, { replace: true })
          return
        } finally {
          setIsUploadingPending(false)
        }
      }

      showToast({ severity: 'success', summary: 'Gift created' })
      navigate(`/admin/gifts/${created.id}`, { replace: true })
    } catch (error) {
      showApiError(error)
    }
  }

  function confirmStatusToggle() {
    if (!gift) return
    const activating = !gift.active
    confirmDialog({
      header: activating ? 'Mark in stock' : 'Mark out of stock',
      message: activating
        ? `${gift.name} will become visible in the Gift Store again.`
        : `${gift.name} will be hidden from the Gift Store as out of stock. This can be reversed later.`,
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: activating ? undefined : 'p-button-danger',
      accept: async () => {
        try {
          await setStatus.mutateAsync(activating)
          showToast({ severity: 'success', summary: activating ? 'Gift marked in stock' : 'Gift marked out of stock' })
        } catch (error) {
          showApiError(error)
        }
      },
    })
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
        subtitle={
          isEdit && gift
            ? isVendorOwned
              ? `Submitted by ${gift.vendorName}. You can view it and manage its catalogue visibility, but not edit its content.`
              : 'Update gift details and manage its catalogue visibility.'
            : 'Add a new gift to the catalogue.'
        }
        backTo="/admin/gifts"
        actions={
          isEdit && gift ? (
            <StatusBadge status={gift.active ? 'ACTIVE' : 'INACTIVE'} label={gift.active ? 'In stock' : 'Out of stock'} />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card title="Gift details" className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <fieldset disabled={isVendorOwned} className="contents">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Gift name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <InputText
                    id="name"
                    {...field}
                    className={errors.name ? 'p-invalid' : ''}
                    placeholder="Premium Diary Set"
                  />
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
                  <>
                    <Dropdown
                      inputId="category"
                      value={categorySelect}
                      onChange={(e) => {
                        setCategorySelect(e.value)
                        if (e.value !== OTHER_OPTION) {
                          field.onChange(e.value)
                        } else if (knownCategories.includes(field.value)) {
                          // Switching away from a known category into "Other" -- start blank, not with the old value.
                          field.onChange('')
                        }
                      }}
                      options={[...knownCategories.map((c) => ({ label: c, value: c })), { label: 'Other', value: OTHER_OPTION }]}
                      placeholder="Select a category"
                      filter
                      className={errors.category ? 'p-invalid' : ''}
                    />
                    {categorySelect === OTHER_OPTION && (
                      <InputText
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="Type the new category"
                        className={`mt-1.5 ${errors.category ? 'p-invalid' : ''}`}
                        autoFocus
                      />
                    )}
                  </>
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

            {totalPrice != null && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3.5 py-2.5">
                <span className="text-sm text-text-muted">Total price shown to companies</span>
                <span className="text-base font-semibold text-text">{formatCurrency(totalPrice)}</span>
              </div>
            )}

            {isEdit && gift && (
              <p className="text-xs text-text-muted">Added on {new Date(gift.createdAt).toLocaleDateString()}</p>
            )}
          </fieldset>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!isVendorOwned && (
                <Button
                  type="submit"
                  label={isEdit ? 'Save changes' : isUploadingPending ? 'Uploading images...' : 'Create gift'}
                  loading={submitting}
                  disabled={isEdit && !isDirty}
                />
              )}
              {isEdit && gift && (
                <Button
                  type="button"
                  label={gift.active ? 'Mark out of stock' : 'Mark in stock'}
                  severity={gift.active ? 'danger' : 'success'}
                  outlined
                  loading={setStatus.isPending}
                  onClick={confirmStatusToggle}
                />
              )}
            </div>
          </form>
        </Card>

        <Card
          title="Images"
          subTitle={`${existingImageCount} of ${MAX_GIFT_IMAGES} used${isEdit ? '. Shown in this order in the Gift Store.' : '. Optional — add now or after creating.'}`}
          className="lg:col-span-1"
        >
          <div className="flex flex-wrap gap-3">
            {isEdit && gift ? (
              <>
                {[...gift.images]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((image) => (
                    <div
                      key={image.id}
                      className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
                    >
                      <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                      {!isVendorOwned && (
                        <button
                          type="button"
                          onClick={() => confirmRemoveImage(image.id)}
                          aria-label="Remove image"
                          className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <i className="pi pi-times text-[10px]" />
                        </button>
                      )}
                    </div>
                  ))}

                {!atImageCap && !isVendorOwned && (
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
                  <div
                    key={`${file.name}-${index}`}
                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
                  >
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
                    // Force a fresh instance per file: PrimeReact's basic mode
                    // unmounts its native <input> after the first selection, so
                    // the same instance can't be used to pick a second file.
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
          {atImageCap && (
            <p className="mt-3 text-xs text-text-muted">Maximum of {MAX_GIFT_IMAGES} images reached.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
