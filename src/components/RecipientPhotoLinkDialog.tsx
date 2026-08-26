import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { buildWhatsAppShareUrl } from '@/lib/whatsapp'
import { showToast } from '@/lib/toast'

export interface RecipientPhotoLinkPrompt {
  link: string
  recipientName: string | null
  phone: string | null
}

/** Shown right after approving a submission that had no photo on file -- the recipient's already been emailed the link; this offers the approver a one-click way to also forward it themselves. */
export function RecipientPhotoLinkDialog({ prompt, onHide }: { prompt: RecipientPhotoLinkPrompt | null; onHide: () => void }) {
  return (
    <Dialog header="Recipient photo requested" visible={prompt !== null} onHide={onHide} style={{ width: '28rem' }}>
      {prompt && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            {prompt.recipientName ?? 'This recipient'} didn't have a photo on file, so we've emailed them a link to upload one. You
            can also forward it directly.
          </p>
          <div className="flex flex-wrap gap-2">
            {prompt.phone && (
              <Button
                label="Share via WhatsApp"
                icon="pi pi-whatsapp"
                onClick={() =>
                  window.open(
                    buildWhatsAppShareUrl(
                      prompt.phone!,
                      `Hi! We just need a quick photo from you to send your gift. Please upload it here: ${prompt.link}`,
                    ),
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              />
            )}
            <Button
              label="Copy link"
              icon="pi pi-copy"
              outlined
              onClick={() => {
                navigator.clipboard.writeText(prompt.link)
                showToast({ severity: 'success', summary: 'Link copied' })
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button label="Close" text onClick={onHide} />
          </div>
        </div>
      )}
    </Dialog>
  )
}
