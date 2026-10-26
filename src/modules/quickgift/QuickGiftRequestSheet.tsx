import { Gift as GiftIcon, ImageOff, Send } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { QuickGiftRequest, QuickGiftStatus } from '@/api/quickGifts'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDateOnly, formatDateTime } from '@/lib/datetime'

const STATUS_VARIANT: Record<QuickGiftStatus, BadgeProps['variant']> = {
  SUBMITTED: 'warning-soft',
  APPROVED: 'success-soft',
  REJECTED: 'destructive-soft',
}

export function QuickGiftStatusBadge({ status }: { status: QuickGiftStatus }) {
  const { t } = useTranslation('gifts')
  return (
    <Badge variant={STATUS_VARIANT[status]} className="whitespace-nowrap">
      {t(`status.${status}`)}
    </Badge>
  )
}

function Detail({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

/** One request in full: who it is for, what was ordered, the print details and the recipient's photo. */
export function QuickGiftRequestSheet({
  request,
  onClose,
  onRequestPhotoLink,
  requestingPhotoLink,
}: {
  request: QuickGiftRequest | null
  onClose: () => void
  onRequestPhotoLink: (request: QuickGiftRequest) => void
  requestingPhotoLink: boolean
}) {
  const { t } = useTranslation('gifts')
  const doctor = request?.doctor
  const hasDoctor = Boolean(doctor && (doctor.registrationNumber || doctor.qualification || doctor.speciality || doctor.clinicName))

  return (
    <Sheet open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {request && (
          <>
            <SheetHeader className="border-b px-6 py-4 pr-10 text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <GiftIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{request.giftName}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    {request.displayId}
                    <QuickGiftStatusBadge status={request.status} />
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {request.rejectionReason && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {t('detail.rejected', { reason: request.rejectionReason })}
                </p>
              )}

              <dl className="grid grid-cols-2 gap-4">
                <Detail label={t('detail.recipient')}>{request.recipientName}</Detail>
                <Detail label={t('detail.phone')}>{request.recipientPhone}</Detail>
                <Detail label={t('detail.address')} wide>
                  {request.deliveryAddress}
                </Detail>
                {request.recipientEmail && <Detail label={t('detail.email')}>{request.recipientEmail}</Detail>}
                {request.recipientDob && <Detail label={t('detail.dob')}>{formatDateOnly(request.recipientDob)}</Detail>}
                <Detail label={t('detail.quantity')}>{request.quantity}</Detail>
                {request.vendorName && <Detail label={t('detail.vendor')}>{request.vendorName}</Detail>}
                {request.orderDisplayId && <Detail label={t('detail.order')}>{request.orderDisplayId}</Detail>}
                {request.orgUnitName && <Detail label={t('detail.orgUnit')}>{request.orgUnitName}</Detail>}
                <Detail label={t('landing.column.sent')}>{formatDateTime(request.createdAt)}</Detail>
                {request.giftMessage && (
                  <Detail label={t('detail.message')} wide>
                    {request.giftMessage}
                  </Detail>
                )}
                {request.internalNotes && (
                  <Detail label={t('detail.notes')} wide>
                    {request.internalNotes}
                  </Detail>
                )}
              </dl>

              {hasDoctor && doctor && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">{t('detail.doctor')}</h3>
                  <dl className="grid grid-cols-2 gap-4 rounded-md border bg-muted/40 p-3">
                    {doctor.registrationNumber && <Detail label={t('detail.registrationNumber')}>{doctor.registrationNumber}</Detail>}
                    {doctor.qualification && <Detail label={t('detail.qualification')}>{doctor.qualification}</Detail>}
                    {doctor.speciality && <Detail label={t('detail.speciality')}>{doctor.speciality}</Detail>}
                    {doctor.clinicName && <Detail label={t('detail.clinicName')}>{doctor.clinicName}</Detail>}
                  </dl>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('detail.photo')}</h3>
                {request.photoUrl ? (
                  <a href={request.photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <img src={request.photoUrl} alt={request.photoFileName ?? ''} className="h-36 w-36 rounded-md border object-cover" />
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageOff className="h-4 w-4" />
                    {t('detail.noPhoto')}
                  </p>
                )}
                {request.status === 'APPROVED' && (
                  <Button variant="outline" size="sm" loading={requestingPhotoLink} onClick={() => onRequestPhotoLink(request)}>
                    <Send />
                    {request.photoUrl ? t('detail.resendLink') : t('detail.requestPhoto')}
                  </Button>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
