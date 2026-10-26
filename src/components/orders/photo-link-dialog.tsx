import { Copy, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AppDialog } from '@/components/app-dialog'
import { Button } from '@/components/ui/button'
import { buildWhatsAppShareUrl } from '@/lib/whatsapp'

export interface PhotoLinkPrompt {
  link: string
  recipientName: string | null
  phone: string | null
}

/**
 * Shown right after a recipient's photo upload link was issued: they have already been emailed it,
 * and this lets the person who asked forward it too, over WhatsApp or by copying it.
 */
export function PhotoLinkDialog({ prompt, onClose }: { prompt: PhotoLinkPrompt | null; onClose: () => void }) {
  const { t } = useTranslation('orders')
  return (
    <AppDialog
      open={prompt !== null}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title={t('photoLink.title')}
      description={prompt ? t('photoLink.body', { name: prompt.recipientName ?? t('photoLink.someone') }) : undefined}
      cancelLabel={t('action.close', { ns: 'common' })}
    >
      {prompt && (
        <div className="flex flex-wrap gap-2">
          {prompt.phone && (
            <Button asChild>
              <a
                href={buildWhatsAppShareUrl(prompt.phone, t('photoLink.message', { link: prompt.link }))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                {t('photoLink.whatsapp')}
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(prompt.link)
              toast.success(t('photoLink.copied'))
            }}
          >
            <Copy />
            {t('photoLink.copy')}
          </Button>
        </div>
      )}
    </AppDialog>
  )
}
