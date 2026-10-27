import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'

import type { Gift, GiftInput } from '@/api/gifts'
import type { FieldConfig } from '@/components/fields/form-generator'
import { decimalField, numberField, selectField, switchField, textField } from '@/components/masters/master-fields'

/** One image per gift for now -- raise this (and bring back a carousel in the Gift Store) to allow more. */
export const MAX_GIFT_IMAGES = 1

export const GIFT_IMAGE_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
}

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

const num = (value: unknown) => (value === '' || value == null ? undefined : Number(value))
const asString = (value: number | null | undefined) => (value == null ? '' : String(value))

/** price + price × markup% + price × commission%, as the backend computes it. */
export function giftTotalOf(values: Record<string, unknown>, fees?: Pick<Gift, 'markupFeePercentage' | 'commissionFeePercentage'>): number | null {
  const price = num(values.price)
  if (price === undefined || Number.isNaN(price)) return null
  const markup = num(values.markupFeePercentage) ?? fees?.markupFeePercentage ?? 0
  const commission = num(values.commissionFeePercentage) ?? fees?.commissionFeePercentage ?? 0
  return price + (price * markup) / 100 + (price * commission) / 100
}

/**
 * The gift form's fields, values and payload, shared by the admin catalogue and the vendor
 * portal so both edit a gift the same way. `withFees: false` (the vendor) leaves the markup and
 * commission -- Wrappzo's own margin -- off the form and sends the gift's current ones unchanged.
 */
export function useGiftFormModel({ gift, knownCategories, withFees }: { gift?: Gift; knownCategories: string[]; withFees: boolean }) {
  const { t } = useTranslation('admin')

  const categories = useMemo(() => [...new Set([...FIXED_CATEGORIES, ...knownCategories.filter(Boolean)])].sort(), [knownCategories])

  const fields = useMemo<FieldConfig[]>(
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
      ...(withFees
        ? [
            decimalField({ id: 'markupFeePercentage', label: t('gifts.detail.markup'), max: 100, scale: 2 }),
            decimalField({ id: 'commissionFeePercentage', label: t('gifts.detail.commission'), max: 100, scale: 2 }),
          ]
        : []),
      switchField({ id: 'photoRequired', label: t('gifts.detail.photoRequired'), description: t('gifts.detail.photoRequiredHelp') }),
      switchField({ id: 'artworkRequired', label: t('gifts.detail.artworkRequired'), description: t('gifts.detail.artworkRequiredHelp') }),
    ],
    [t, categories, withFees],
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

  function toInput(submitted: Record<string, unknown>): GiftInput {
    return {
      name: String(submitted.name).trim(),
      category: submitted.category === OTHER ? String(submitted.otherCategory).trim() : String(submitted.category),
      description: String(submitted.description ?? '').trim() || undefined,
      moq: num(submitted.moq),
      leadTimeDays: num(submitted.leadTimeDays),
      price: Number(submitted.price),
      markupFeePercentage: withFees ? num(submitted.markupFeePercentage) : (gift?.markupFeePercentage ?? undefined),
      commissionFeePercentage: withFees ? num(submitted.commissionFeePercentage) : (gift?.commissionFeePercentage ?? undefined),
      photoRequired: Boolean(submitted.photoRequired),
      artworkRequired: Boolean(submitted.artworkRequired),
    }
  }

  return { fields, values, refine, toInput }
}
