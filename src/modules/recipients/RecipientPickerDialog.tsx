import { Contact, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Recipient } from '@/api/recipients'
import { AppDialog } from '@/components/app-dialog'
import { EmptyState } from '@/components/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyRecipients } from '@/hooks/useRecipients'

/**
 * Pick several doctors at once from the caller's own list (My Doctors) -- e.g. straight into a
 * Quick Gift form instead of retyping them. The list is small, so it is loaded whole and the box
 * only narrows it.
 */
export function RecipientPickerDialog({
  visible,
  onHide,
  onConfirm,
}: {
  visible: boolean
  onHide: () => void
  onConfirm: (recipients: Recipient[]) => void
}) {
  const { t } = useTranslation('recipients')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, Recipient>>(new Map())
  const { data: mine, isLoading } = useMyRecipients()
  const needle = search.trim().toLowerCase()
  const results = (mine ?? []).filter(
    (r) =>
      needle === '' ||
      [r.name, r.phone, r.email, r.doctor?.registrationNumber, r.doctor?.clinicName].some((v) => v?.toLowerCase().includes(needle)),
  )

  function reset() {
    setSelected(new Map())
    setSearch('')
  }

  function toggle(recipient: Recipient, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (checked) next.set(recipient.id, recipient)
      else next.delete(recipient.id)
      return next
    })
  }

  return (
    <AppDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          reset()
          onHide()
        }
      }}
      size="lg"
      title={t('picker.title')}
      confirmLabel={selected.size > 0 ? t('picker.add', { count: selected.size }) : t('picker.addNone')}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      confirmDisabled={selected.size === 0}
      onConfirm={() => {
        onConfirm([...selected.values()])
        reset()
      }}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('picker.search')}
            aria-label={t('picker.search')}
            className="pl-8"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : results.length === 0 ? (
          <EmptyState variant="plain" size="sm" icon={Contact} title={t('picker.noMatchTitle')} description={t('picker.noMatchBody')} />
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
            {results.map((recipient) => {
              const id = `pick-${recipient.id}`
              return (
                <li key={recipient.id}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                    <Checkbox id={id} checked={selected.has(recipient.id)} onCheckedChange={(checked) => toggle(recipient, checked === true)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{recipient.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[recipient.phone, recipient.doctor?.registrationNumber, recipient.doctor?.clinicName, recipient.email]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppDialog>
  )
}
