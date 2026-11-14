import { Contact, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Recipient } from '@/api/recipients'
import { AppDialog } from '@/components/app-dialog'
import { EmptyState } from '@/components/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyRecipientsList } from '@/hooks/useRecipients'

/**
 * Pick several doctors at once from the caller's own list (the doctors they added or are mapped to) -- e.g. straight into a
 * Quick Gift form instead of retyping them. The list can run to hundreds, so the server searches it and hands over a page at a
 * time as the list is scrolled; what is ticked is remembered across searches. One tick at the top picks every doctor the search
 * matches -- the pages not yet loaded are fetched for it -- and another clears them.
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
  const [selectingAll, setSelectingAll] = useState(false)
  const { items: results, total, hasMore, fetchNextPage, isLoading, isLoadingMore, onScroll } = useMyRecipientsList(search.trim())

  function reset() {
    setSelected(new Map())
    setSearch('')
    setSelectingAll(false)
  }

  // "Select all" keeps going until every doctor the search matches is loaded and ticked, however many pages that takes.
  useEffect(() => {
    if (!selectingAll || isLoading) return
    setSelected((prev) => {
      if (results.every((recipient) => prev.has(recipient.id))) return prev
      const next = new Map(prev)
      results.forEach((recipient) => next.set(recipient.id, recipient))
      return next
    })
    if (hasMore) {
      if (!isLoadingMore) fetchNextPage()
    } else {
      setSelectingAll(false)
    }
  }, [selectingAll, results, hasMore, isLoading, isLoadingMore, fetchNextPage])

  const everyoneTicked = results.length > 0 && results.every((recipient) => selected.has(recipient.id))
  const someoneTicked = results.some((recipient) => selected.has(recipient.id))

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectingAll(true)
      return
    }
    setSelectingAll(false)
    setSelected((prev) => {
      const next = new Map(prev)
      results.forEach((recipient) => next.delete(recipient.id))
      return next
    })
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
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectingAll(false)
            }}
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
          <ul className="max-h-80 divide-y overflow-y-auto rounded-md border" onScroll={onScroll}>
            <li className="sticky top-0 z-10 bg-card">
              <label htmlFor="pick-all" className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-medium hover:bg-muted/50">
                <Checkbox
                  id="pick-all"
                  checked={selectingAll || everyoneTicked ? true : someoneTicked ? 'indeterminate' : false}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
                {t('picker.selectAll', { count: total ?? results.length })}
              </label>
            </li>
            {results.map((recipient) => {
              const id = `pick-${recipient.id}`
              return (
                <li key={recipient.id}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                    <Checkbox id={id} checked={selected.has(recipient.id)} onCheckedChange={(checked) => toggle(recipient, checked === true)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{recipient.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[recipient.pcode, recipient.phone, recipient.doctor?.clinicName, recipient.email]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
            {isLoadingMore && (
              <li className="px-3 py-2.5">
                <Skeleton className="h-8 w-full" />
              </li>
            )}
          </ul>
        )}
      </div>
    </AppDialog>
  )
}
