import { Loader2, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { COMPANY_NAV, type NavSource } from '@/components/sidebar-nav-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useMenuLabel, useMenuLabels, useSaveMenuLabels } from '@/hooks/use-menu-labels'
import { cn } from '@/lib/utils'

/** The server's limit on a menu name. */
const MAX_LENGTH = 60

interface MenuRow {
  id: string
  titleKey: string
  depth: number
  icon?: NavSource['icon']
}

/** Every company menu, sections and their entries alike, in sidebar order. The developer-only showcase is left out. */
function flatten(items: NavSource[], depth = 0): MenuRow[] {
  return items.flatMap((item) =>
    item.id === 'components'
      ? []
      : [{ id: item.id, titleKey: item.titleKey, depth, icon: item.icon }, ...flatten(item.children ?? [], depth + 1)],
  )
}

const sameLabels = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([id, name]) => b[id] === name)

/** Drops blank names (blank means "use the default") and tidies spacing, the same way the server does. */
function cleaned(draft: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(draft)
      .map(([id, name]) => [id, name.trim().replace(/\s+/g, ' ')] as const)
      .filter(([, name]) => name),
  )
}

/**
 * A company admin naming the menus in their own navigation, e.g. "Request Prescription Pads" for
 * Quick Gift. Applies to everyone in the company, in every language; the page each menu opens
 * takes the same name. Blank keeps the default.
 */
export function MenuNamesPage() {
  const { t } = useTranslation()
  const showError = useApiErrorToast()
  const saved = useMenuLabels()
  const save = useSaveMenuLabels()
  const rows = useMemo(() => flatten(COMPANY_NAV), [])
  const [draft, setDraft] = useState<Record<string, string>>(saved)
  const pageTitle = useMenuLabel('menu-names', t('nav.menuNames'))

  const next = cleaned(draft)
  const dirty = !sameLabels(next, saved)
  const tooLong = Object.values(next).some((name) => name.length > MAX_LENGTH)

  async function onSave() {
    try {
      const result = await save.mutateAsync(next)
      setDraft(result)
      toast.success(t('menuNames.saved'))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-4">
      <MasterPageHeader title={pageTitle} description={t('menuNames.subtitle')} />
      <SectionCard
        title={t('menuNames.cardTitle')}
        description={t('menuNames.cardHelp')}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!dirty || save.isPending} onClick={() => setDraft(saved)}>
              {t('menuNames.discard')}
            </Button>
            <Button size="sm" disabled={!dirty || tooLong || save.isPending} onClick={() => void onSave()}>
              {save.isPending && <Loader2 className="animate-spin" />}
              {t('menuNames.save')}
            </Button>
          </div>
        }
      >
        <ul className="divide-y">
          {rows.map((row) => {
            const fallback = t(row.titleKey)
            const value = draft[row.id] ?? ''
            const Icon = row.icon
            const inputId = `menu-name-${row.id}`
            return (
              <li key={row.id} className="grid items-center gap-2 py-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
                <label htmlFor={inputId} className={cn('flex min-w-0 items-center gap-2 text-sm', row.depth === 0 && 'font-semibold')}>
                  <span style={{ paddingLeft: `${Math.max(row.depth - 1, 0) * 1.25}rem` }} className="flex min-w-0 items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{fallback}</span>
                  </span>
                </label>
                <Input
                  id={inputId}
                  value={value}
                  placeholder={fallback}
                  maxLength={MAX_LENGTH}
                  aria-label={t('menuNames.nameFor', { menu: fallback })}
                  onChange={(e) => setDraft((current) => ({ ...current, [row.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!value}
                  title={t('menuNames.reset')}
                  aria-label={t('menuNames.resetFor', { menu: fallback })}
                  onClick={() => setDraft(({ [row.id]: _removed, ...rest }) => rest)}
                >
                  <RotateCcw />
                </Button>
              </li>
            )
          })}
        </ul>
      </SectionCard>
    </div>
  )
}
