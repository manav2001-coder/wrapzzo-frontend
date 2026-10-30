import { Check, ExternalLink, FileText, Hourglass, MessageSquareWarning, Palette } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { OrderDesign } from '@/api/orderDesigns'
import { AppDialog } from '@/components/app-dialog'
import { ArtworkApprovalTrail } from '@/components/orders/artwork-approval-trail'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useApproveOrderDesign, useOrderDesigns, useRejectOrderDesign } from '@/hooks/useOrderDesigns'
import { formatDateTime } from '@/lib/datetime'

const VARIANT: Record<OrderDesign['status'], BadgeProps['variant']> = {
  PENDING_REVIEW: 'primary-soft',
  PENDING_FINAL_APPROVAL: 'warning-soft',
  APPROVED: 'success-soft',
  REJECTED: 'destructive-soft',
}

const IMAGE_FILE = /\.(png|jpe?g|webp|gif|svg)$/i

function isImage(design: OrderDesign): boolean {
  return IMAGE_FILE.test(design.fileName ?? '') || IMAGE_FILE.test(design.fileUrl.split('?')[0])
}

/** The proof itself: an image inline, anything else (a PDF) as a file to open. */
function Proof({ design }: { design: OrderDesign }) {
  const { t } = useTranslation('orders')
  return isImage(design) ? (
    <a href={design.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border bg-muted">
      <img src={design.fileUrl} alt={t('artwork.version', { n: design.versionNo })} className="max-h-80 w-full object-contain" />
    </a>
  ) : (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="truncate">{design.fileName ?? t('artwork.version', { n: design.versionNo })}</span>
      </span>
      <Button asChild size="sm" variant="outline">
        <a href={design.fileUrl} target="_blank" rel="noreferrer">
          <ExternalLink />
          {t('artwork.open')}
        </a>
      </Button>
    </div>
  )
}

/**
 * The company side of the artwork loop: the vendor's newest proof up front with Approve / Request
 * changes, and every earlier version with its verdict below. A rejection needs a comment -- it is
 * what the vendor works from. Approving is what unlocks dispatch for an artwork-required order.
 */
export function ArtworkReview({ orderId, artworkRequired }: { orderId: string; artworkRequired: boolean }) {
  const { t } = useTranslation('orders')
  const showError = useApiErrorToast()
  const { data: designs, isLoading } = useOrderDesigns(orderId)
  const approve = useApproveOrderDesign(orderId)
  const reject = useRejectOrderDesign(orderId)
  const [rejecting, setRejecting] = useState<OrderDesign | null>(null)
  const [comment, setComment] = useState('')

  const sorted = [...(designs ?? [])].sort((a, b) => b.versionNo - a.versionNo)
  const [latest, ...earlier] = sorted
  const approved = sorted.find((d) => d.status === 'APPROVED')

  async function onApprove(design: OrderDesign) {
    try {
      const result = await approve.mutateAsync(design.id)
      toast.success(
        result.status === 'PENDING_FINAL_APPROVAL'
          ? t('artwork.approvedPendingFinal', { n: design.versionNo })
          : t('artwork.approved', { n: design.versionNo }),
      )
    } catch (err) {
      showError(err)
    }
  }

  async function onReject() {
    if (!rejecting || !comment.trim()) return
    try {
      await reject.mutateAsync({ designId: rejecting.id, comment: comment.trim() })
      toast.success(t('artwork.rejected', { n: rejecting.versionNo }))
      setRejecting(null)
      setComment('')
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4 text-primary" />
            {t('artwork.title')}
          </h3>
          <p className="text-xs text-muted-foreground">{artworkRequired ? t('artwork.requiredHelp') : t('artwork.optionalHelp')}</p>
        </div>
        {approved && (
          <Badge variant="success-soft" className="gap-1 whitespace-nowrap">
            <Check className="h-3 w-3" />
            {t('artwork.approvedBadge', { n: approved.versionNo })}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !latest ? (
        <p className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
          <Hourglass className="h-4 w-4" />
          {t('artwork.waitingForVendor')}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{t('artwork.version', { n: latest.versionNo })}</span>
              <Badge variant={VARIANT[latest.status]}>{t(`artwork.status.${latest.status}`)}</Badge>
              <span className="text-xs text-muted-foreground">
                {latest.uploadedByVendorName} · {formatDateTime(latest.createdAt)}
              </span>
            </div>
            <Proof design={latest} />
            {latest.status === 'PENDING_REVIEW' ? (
              <div className="flex flex-wrap gap-2">
                <Button loading={approve.isPending} onClick={() => void onApprove(latest)}>
                  <Check />
                  {t('artwork.approve')}
                </Button>
                <Button variant="outline" onClick={() => setRejecting(latest)}>
                  <MessageSquareWarning />
                  {t('artwork.requestChanges')}
                </Button>
              </div>
            ) : (
              latest.reviewComment && (
                <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm">
                  <span className="font-medium">{t('artwork.yourFeedback')}</span> “{latest.reviewComment}”
                </p>
              )
            )}
            {latest.status === 'REJECTED' && <p className="text-xs text-muted-foreground">{t('artwork.waitingForRework')}</p>}
            {latest.status === 'PENDING_FINAL_APPROVAL' && (
              <p className="rounded-md bg-warning/10 px-3 py-2 text-sm">
                {t('artwork.waitingAtLevel', { level: latest.approvalLevel ?? 1, total: latest.approvalLevels ?? 1 })}
              </p>
            )}
            {latest.approvals.length > 1 || latest.status === 'PENDING_FINAL_APPROVAL' ? (
              <div className="rounded-md border px-3 py-2">
                <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('artwork.trail.title')}</h4>
                <ArtworkApprovalTrail
                  steps={latest.approvals}
                  pending={
                    latest.status === 'PENDING_FINAL_APPROVAL' ? { level: latest.approvalLevel ?? 1, waitingOnName: latest.waitingOnName } : null
                  }
                />
              </div>
            ) : null}
          </div>

          {earlier.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('artwork.earlier')}</h4>
              <ol className="space-y-1.5">
                {earlier.map((design) => (
                  <li key={design.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">{t('artwork.version', { n: design.versionNo })}</span>
                        <Badge variant={VARIANT[design.status]}>{t(`artwork.status.${design.status}`)}</Badge>
                      </div>
                      {design.reviewComment && <p className="mt-0.5 text-xs text-muted-foreground">“{design.reviewComment}”</p>}
                    </div>
                    <Button asChild size="icon-sm" variant="ghost">
                      <a href={design.fileUrl} target="_blank" rel="noreferrer" aria-label={`${t('artwork.open')} v${design.versionNo}`}>
                        <ExternalLink />
                      </a>
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <AppDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null)
            setComment('')
          }
        }}
        size="sm"
        title={rejecting ? t('artwork.rejectTitle', { n: rejecting.versionNo }) : ''}
        description={t('artwork.rejectBody')}
        confirmLabel={t('artwork.sendBack')}
        cancelLabel={t('action.cancel', { ns: 'common' })}
        confirmDisabled={!comment.trim()}
        loading={reject.isPending}
        onConfirm={() => void onReject()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="artwork-feedback">{t('artwork.feedbackLabel')}</Label>
          <Textarea
            id="artwork-feedback"
            rows={4}
            value={comment}
            placeholder={t('artwork.feedbackPlaceholder')}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </AppDialog>
    </section>
  )
}
