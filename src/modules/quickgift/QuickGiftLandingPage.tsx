import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Send, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { QuickGiftRequest } from '@/api/quickGifts'
import type { Recipient, UpcomingBirthday } from '@/api/recipients'
import { AppTabs } from '@/components/app-tabs'
import { DataTable } from '@/components/data-table'
import { listEmptyBody } from '@/components/data-table/list-body'
import { GiftCatalogue } from '@/components/gifts/gift-catalogue'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { PhotoLinkDialog, type PhotoLinkPrompt } from '@/components/orders/photo-link-dialog'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useActiveGifts } from '@/hooks/useGifts'
import { useMyQuickGiftRequests, useRequestQuickGiftPhotoLink } from '@/hooks/useQuickGifts'
import { formatDate } from '@/lib/datetime'
import type { ListFieldMap } from '@/lib/list-fields'
import { QuickGiftRequestSheet, QuickGiftStatusBadge } from './QuickGiftRequestSheet'

const LIST_FIELDS: ListFieldMap = {
  displayId: 'text',
  giftName: 'text',
  recipientName: 'text',
  vendorName: 'text',
  quantity: 'number',
  status: 'enum',
}

const STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED'] as const

type Tab = 'send' | 'requests'

/**
 * Quick Gift's home: pick a gift to send (optionally for a recipient carried in from the
 * birthdays widget), and follow every request the user has sent.
 */
export function QuickGiftLandingPage() {
  const { t } = useTranslation('gifts')
  const navigate = useNavigate()
  const location = useLocation()
  const showError = useApiErrorToast()
  const { prefillRecipient } = (location.state as { prefillRecipient?: Recipient | UpcomingBirthday } | null) ?? {}
  const { data: gifts, isLoading: giftsLoading } = useActiveGifts()
  const { data: requests, isLoading, error, refetch } = useMyQuickGiftRequests()
  const requestPhotoLink = useRequestQuickGiftPhotoLink()

  const [tab, setTab] = useState<Tab>('send')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [photoPrompt, setPhotoPrompt] = useState<PhotoLinkPrompt | null>(null)
  const viewing = requests?.find((request) => request.id === viewingId) ?? null

  async function handleRequestPhotoLink(request: QuickGiftRequest) {
    try {
      const result = await requestPhotoLink.mutateAsync(request.id)
      setPhotoPrompt({ link: result.recipientUploadUrl, phone: request.recipientPhone, recipientName: request.recipientName })
      toast.success(t('detail.linkSent'))
    } catch (err) {
      showError(err)
    }
  }

  const columns = useMemo<ColumnDef<QuickGiftRequest, unknown>[]>(
    () => [
      {
        id: 'giftName',
        accessorKey: 'giftName',
        header: t('landing.column.gift'),
        meta: { className: 'min-w-[200px]', align: 'left' },
        cell: ({ row }) => (
          <button type="button" className="truncate font-medium hover:underline" onClick={() => setViewingId(row.original.id)}>
            {row.original.giftName}
          </button>
        ),
      },
      { id: 'displayId', accessorKey: 'displayId', header: t('landing.column.request'), meta: { className: 'min-w-[100px]' } },
      { id: 'recipientName', accessorKey: 'recipientName', header: t('landing.column.recipient'), meta: { className: 'min-w-[160px]' } },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: t('landing.column.quantity'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[70px]', align: 'right' },
      },
      {
        id: 'vendorName',
        accessorFn: (request) => request.vendorName ?? '',
        header: t('landing.column.vendor'),
        meta: { className: 'min-w-[150px]' },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('landing.column.status'),
        filterFn: 'equals',
        meta: {
          className: 'min-w-[140px]',
          filterVariant: 'select',
          filterOptions: STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
        },
        cell: ({ row }) => <QuickGiftStatusBadge status={row.original.status} />,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('landing.column.sent'),
        enableColumnFilter: false,
        meta: { className: 'min-w-[110px]' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { className: 'w-[56px]', pin: 'right' },
        cell: ({ row }) => (
          <IconButton icon={Eye} label={row.original.displayId} onClick={() => setViewingId(row.original.id)} />
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <MasterPageHeader
        title={t('landing.title')}
        description={prefillRecipient ? t('landing.subtitleFor', { name: prefillRecipient.name }) : t('landing.subtitle')}
      />

      <AppTabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="frame-free"
        tabs={[
          {
            value: 'send',
            label: t('landing.tabSend'),
            icon: Zap,
            content: (
              <GiftCatalogue
                gifts={gifts}
                isLoading={giftsLoading}
                renderActions={(gift) => (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/quick-gift/new/${gift.id}`, prefillRecipient ? { state: { prefillRecipient } } : undefined)}
                  >
                    <Send />
                    {t('landing.send')}
                  </Button>
                )}
              />
            ),
          },
          {
            value: 'requests',
            label: t('landing.tabRequests'),
            badge: requests?.length || undefined,
            content: (
              <DataTable<QuickGiftRequest>
                columns={columns}
                data={requests ?? []}
                isLoading={isLoading}
                listFields={LIST_FIELDS}
                searchable
                showRowSelectionColumn={false}
                defaultSort={{ id: 'createdAt', desc: true }}
                getRowId={(request) => request.id}
                tableId="my-quick-gifts"
                configNamespace="my-quick-gifts"
                emptyState={listEmptyBody({
                  error,
                  onRetry: () => void refetch(),
                  icon: <Zap className="h-8 w-8 opacity-50" />,
                  message: t('landing.emptyTitle'),
                  description: t('landing.emptyBody'),
                })}
              />
            ),
          },
        ]}
      />

      <QuickGiftRequestSheet
        request={viewing}
        onClose={() => setViewingId(null)}
        onRequestPhotoLink={handleRequestPhotoLink}
        requestingPhotoLink={requestPhotoLink.isPending}
      />
      <PhotoLinkDialog prompt={photoPrompt} onClose={() => setPhotoPrompt(null)} />
    </div>
  )
}
