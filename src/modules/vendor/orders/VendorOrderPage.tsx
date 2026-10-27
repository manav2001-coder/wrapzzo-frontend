import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  ImageOff,
  Lock,
  MessageSquareWarning,
  Package,
  Palette,
  Phone,
  Truck,
  Undo2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import type { OrderDesign } from '@/api/orderDesigns'
import type { OrderStatus } from '@/api/orders'
import type { VendorOrder } from '@/api/vendorOrders'
import { AppDialog } from '@/components/app-dialog'
import { EmptyState } from '@/components/empty-state'
import { FileDropzone } from '@/components/file-dropzone'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useUploadVendorOrderDesign, useVendorOrderDesigns } from '@/hooks/useVendorOrderDesigns'
import { useUpdateVendorOrderStatus, useVendorOrder } from '@/hooks/useVendorOrders'
import { formatDate, formatDateTime } from '@/lib/datetime'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { nextStatusOf, vendorStageOf, type VendorStage } from '@/lib/vendor-order-stage'
import { VendorStageBadge } from './VendorStageBadge'

const PROOF_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
}

const DESIGN_VARIANT: Record<OrderDesign['status'], BadgeProps['variant']> = {
  PENDING_REVIEW: 'primary-soft',
  PENDING_FINAL_APPROVAL: 'warning-soft',
  APPROVED: 'success-soft',
  REJECTED: 'destructive-soft',
}

type StepKey = 'received' | 'artwork' | 'production' | 'dispatched' | 'delivered'

/** How far along the order is, as a list of steps -- the artwork step only for orders that need it. */
function progressOf(order: VendorOrder, stage: VendorStage): { steps: StepKey[]; current: number } {
  const steps: StepKey[] = order.artworkRequired
    ? ['received', 'artwork', 'production', 'dispatched', 'delivered']
    : ['received', 'production', 'dispatched', 'delivered']
  const at: Record<VendorStage, StepKey> = {
    rework: 'artwork',
    artwork: 'artwork',
    review: 'artwork',
    ready: 'production',
    dispatched: 'dispatched',
    // Shipped to the company's warehouse: the vendor's last step is done.
    warehouse: 'delivered',
    delivered: 'delivered',
    cancelled: 'received',
  }
  return { steps, current: steps.indexOf(at[stage]) }
}

function Progress({ order, stage }: { order: VendorOrder; stage: VendorStage }) {
  const { t } = useTranslation('vendor')
  const { steps, current } = progressOf(order, stage)
  const finished = stage === 'delivered' || stage === 'warehouse'
  return (
    <ol className="flex items-start" aria-label={t('order.yourNextStep')}>
      {steps.map((step, index) => {
        const done = index < current || (finished && index === current)
        const active = index === current && !finished
        return (
          <li key={step} className="flex flex-1 items-start last:flex-none">
            <div className="flex w-20 flex-col items-center gap-1.5 text-center sm:w-24">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-xs font-semibold',
                  done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/15 text-primary ring-2 ring-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className={cn('text-[11px] font-medium', !(done || active) && 'text-muted-foreground')}>{t(`order.step.${step}`)}</span>
            </div>
            {index < steps.length - 1 && <span aria-hidden className={cn('mt-4 h-0.5 flex-1', done ? 'bg-primary' : 'bg-border')} />}
          </li>
        )
      })}
    </ol>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

/** The personalisation laid out like the pad's header, so the vendor sees what they'll print. */
function PrintCard({ order }: { order: VendorOrder }) {
  const { t } = useTranslation('vendor')
  const doctor = order.doctor
  const lines = [
    order.recipientName,
    doctor?.qualification,
    doctor?.speciality,
    doctor?.registrationNumber ? t('order.print.registration', { value: doctor.registrationNumber }) : null,
    doctor?.clinicName,
    order.recipientPhone,
  ].filter((line): line is string => Boolean(line))
  const personalised = Boolean(doctor && (doctor.registrationNumber || doctor.qualification || doctor.speciality || doctor.clinicName))

  async function copy() {
    await navigator.clipboard.writeText(lines.join('\n'))
    toast.success(t('order.print.copied'))
  }

  return (
    <SectionCard
      title={t('order.print.title')}
      description={t('order.print.subtitle')}
      actions={
        personalised && (
          <Button size="sm" variant="outline" onClick={() => void copy()}>
            <Copy />
            {t('order.print.copy')}
          </Button>
        )
      }
    >
      {personalised ? (
        <div className="rounded-md border-2 border-dashed border-primary/30 bg-background p-4 font-serif">
          <p className="text-lg font-bold leading-tight">{order.recipientName}</p>
          {doctor?.qualification && <p className="text-sm">{doctor.qualification}</p>}
          {doctor?.speciality && <p className="text-sm italic text-muted-foreground">{doctor.speciality}</p>}
          {doctor?.registrationNumber && <p className="mt-1 text-xs">{t('order.print.registration', { value: doctor.registrationNumber })}</p>}
          <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
            {doctor?.clinicName && <p className="font-medium text-foreground">{doctor.clinicName}</p>}
            {order.deliveryAddress && <p>{order.deliveryAddress}</p>}
            {order.recipientPhone && <p>{order.recipientPhone}</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('order.print.none')}</p>
      )}
    </SectionCard>
  )
}

function ShippingCard({ order }: { order: VendorOrder }) {
  const { t } = useTranslation('vendor')
  return (
    <SectionCard title={t('order.shipping.title')}>
      <dl className="grid grid-cols-2 gap-4">
        <Row label={t('order.shipping.recipient')}>{order.recipientName ?? '—'}</Row>
        <Row label={t('order.shipping.phone')}>
          {order.recipientPhone ? (
            <a href={`tel:${order.recipientPhone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {order.recipientPhone}
            </a>
          ) : (
            '—'
          )}
        </Row>
        {order.shipToWarehouseName ? (
          <>
            <div className="col-span-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Row label={t('order.shipping.shipToWarehouse')}>
                <span className="block">{order.shipToWarehouseName}</span>
                <span className="block font-normal">{order.shipToWarehouseAddress}</span>
              </Row>
            </div>
            <div className="col-span-2">
              <Row label={t('order.shipping.finalRecipient')}>{order.deliveryAddress ?? '—'}</Row>
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <Row label={t('order.shipping.address')}>{order.deliveryAddress ?? '—'}</Row>
          </div>
        )}
        <Row label={t('order.shipping.quantity')}>
          <span className="text-lg font-semibold">{order.quantity}</span>
        </Row>
        <Row label={t('order.shipping.price')}>{formatCurrency(order.price)}</Row>
        {order.giftMessage && (
          <div className="col-span-2">
            <Row label={t('order.shipping.message')}>{order.giftMessage}</Row>
          </div>
        )}
        <div className="col-span-2">
          <Row label={t('order.shipping.photo')}>
            {order.recipientPhotoUrl ? (
              <a href={order.recipientPhotoUrl} target="_blank" rel="noreferrer" className="inline-block">
                <img src={order.recipientPhotoUrl} alt="" className="h-24 w-24 rounded-md border object-cover" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-normal text-muted-foreground">
                <ImageOff className="h-4 w-4" />
                {t('order.shipping.noPhoto')}
              </span>
            )}
          </Row>
        </div>
      </dl>
    </SectionCard>
  )
}

function ArtworkCard({ order }: { order: VendorOrder }) {
  const { t } = useTranslation('vendor')
  const showError = useApiErrorToast()
  const { data: designs, isLoading } = useVendorOrderDesigns(order.id)
  const upload = useUploadVendorOrderDesign(order.id)
  const closed = ['DELIVERED', 'CANCELLED', 'RECEIVED_AT_WAREHOUSE', 'OUT_FOR_DELIVERY'].includes(order.status)

  async function onFile(file: File | null) {
    if (!file) return
    try {
      await upload.mutateAsync(file)
      toast.success(t('order.artwork.uploaded'))
    } catch (err) {
      showError(err)
    }
  }

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          {t('order.artwork.title')}
        </span>
      }
      description={order.artworkRequired ? t('order.artwork.subtitleRequired') : t('order.artwork.subtitleOptional')}
    >
      <div className="space-y-4">
        {order.latestDesignStatus === 'REJECTED' && order.latestDesignComment && (
          <div role="alert" className="flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-destructive">{t('order.artwork.feedback')}</p>
              <p className="text-sm">{order.latestDesignComment}</p>
            </div>
          </div>
        )}

        {!closed && (
          <>
            {order.artworkApproved && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                {t('order.artwork.locked')}
              </p>
            )}
            <FileDropzone
              file={null}
              onChange={(file) => void onFile(file)}
              accept={PROOF_ACCEPT}
              disabled={upload.isPending}
              prompt={t('order.artwork.drop')}
            />
          </>
        )}

        <div>
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('order.artwork.history')}</h4>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !designs || designs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('order.artwork.noVersions')}</p>
          ) : (
            <ol className="space-y-2">
              {designs.map((design) => (
                <li key={design.id} className="flex items-start gap-3 rounded-md border p-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t('order.artwork.version', { n: design.versionNo })}</span>
                      <Badge variant={DESIGN_VARIANT[design.status]}>{t(`order.artwork.status.${design.status}`)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(design.createdAt)}
                      {design.reviewedByUserName && ` · ${t('order.artwork.reviewedBy', { name: design.reviewedByUserName })}`}
                    </p>
                    {design.reviewComment && <p className="text-sm">“{design.reviewComment}”</p>}
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <a href={design.fileUrl} target="_blank" rel="noreferrer" aria-label={`${t('order.artwork.openFile')} v${design.versionNo}`}>
                      <ExternalLink />
                    </a>
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

type PendingMove = { status: OrderStatus; title: string; body: string; label: string }

/**
 * One order, everything the vendor needs to act on it: where it stands, what to do next (with the
 * one button that does it), what to print, where to ship, and the artwork loop with the customer.
 */
export function VendorOrderPage() {
  const { t } = useTranslation('vendor')
  const { id } = useParams<{ id: string }>()
  const showError = useApiErrorToast()
  const { data: order, isLoading, error } = useVendorOrder(id)
  const updateStatus = useUpdateVendorOrderStatus()
  const [pending, setPending] = useState<PendingMove | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <EmptyState icon={Package} title={t('order.notFound')} action={{ label: t('order.back'), to: '/vendor/orders', icon: ArrowLeft }} />
    )
  }

  const stage = vendorStageOf(order)
  const next = nextStatusOf(stage)

  const forward: PendingMove | null =
    next === 'DISPATCHED'
      ? { status: next, label: t('order.action.markDispatched'), title: t('order.action.dispatchTitle', { id: order.displayId }), body: t('order.action.dispatchBody') }
      : next === 'DELIVERED'
        ? { status: next, label: t('order.action.markDelivered'), title: t('order.action.deliverTitle', { id: order.displayId }), body: t('order.action.deliverBody') }
        : null
  const back: PendingMove | null =
    stage === 'dispatched'
      ? {
          status: 'PRODUCTION_QUEUE',
          label: t('order.action.backToProduction'),
          title: t('order.action.backTitle', { id: order.displayId }),
          body: t('order.action.backBody'),
        }
      : null
  const blockedByArtwork = stage === 'artwork' || stage === 'rework' || stage === 'review'

  async function confirmMove() {
    if (!pending || !order) return
    try {
      const updated = await updateStatus.mutateAsync({ id: order.id, status: pending.status })
      toast.success(t('order.action.moved', { id: order.displayId, stage: t(`stage.${vendorStageOf(updated)}`).toLowerCase() }))
    } catch (err) {
      showError(err)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <MasterPageHeader
        lead={
          <Button asChild variant="ghost" size="icon" aria-label={t('order.back')}>
            <Link to="/vendor/orders">
              <ArrowLeft />
            </Link>
          </Button>
        }
        title={`${order.displayId} · ${order.giftName ?? ''}`}
        description={`${order.companyName}${order.campaignName ? ` · ${order.campaignName}` : ''} · ${t('order.received', {
          date: formatDate(order.assignedAt ?? order.createdAt),
        })}`}
        extra={<VendorStageBadge stage={stage} />}
      />

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="overflow-x-auto pb-1">
          <Progress order={order} stage={stage} />
        </div>
        <div
          className={cn(
            'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md p-3',
            stage === 'rework' ? 'bg-destructive/5' : stage === 'ready' ? 'bg-success/5' : 'bg-primary/5',
          )}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('order.yourNextStep')}</p>
            <p className="text-sm font-medium">{t(`next.${stage}`)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {back && (
              <Button variant="outline" onClick={() => setPending(back)}>
                <Undo2 />
                {back.label}
              </Button>
            )}
            {forward && (
              <Button onClick={() => setPending(forward)}>
                {forward.status === 'DISPATCHED' ? <Truck /> : <Check />}
                {forward.label}
              </Button>
            )}
            {blockedByArtwork && (
              <Button disabled title={t('order.action.blocked')}>
                <Lock />
                {t('order.action.markDispatched')}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <PrintCard order={order} />
          <ShippingCard order={order} />
        </div>
        <div className="lg:col-span-3">
          <ArtworkCard order={order} />
        </div>
      </div>

      <AppDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        size="sm"
        title={pending?.title ?? ''}
        description={pending?.body}
        confirmLabel={pending?.label}
        cancelLabel={t('action.cancel', { ns: 'common' })}
        loading={updateStatus.isPending}
        onConfirm={() => void confirmMove()}
      />
    </div>
  )
}
