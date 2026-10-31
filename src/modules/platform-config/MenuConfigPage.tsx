import { Loader2, PencilLine, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { useCompanyScope } from '@/components/masters/company-scope-select'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { COMPANY_NAV, type NavSource } from '@/components/sidebar-nav-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasAccess } from '@/hooks/use-permission'
import { useCompanyMenuLabels, useSaveCompanyMenuLabels } from '@/hooks/use-menu-labels'
import { P } from '@/lib/permissions'
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
 * Platform config > Menu config (MobixFL's menu configuration): platform staff naming the menus in
 * a company's navigation, e.g. "Request Prescription Pads" for Quick Gift. Applies to everyone in
 * that company, in every language; the page each menu opens takes the same name. Blank keeps the
 * default. A company's own admins can't rename their menus.
 */
export function MenuConfigPage() {
  const { t } = useTranslation('admin')
  const scope = useCompanyScope()

  return (
    <div className="space-y-4">
      <MasterPageHeader title={t('platformConfig.menu.title')} description={t('platformConfig.menu.subtitle')} extra={scope.control} />
      {scope.companyId ? (
        <MenuNamesEditor key={scope.companyId} companyId={scope.companyId} />
      ) : (
        <EmptyState icon={PencilLine} size="sm" title={t('platformConfig.menu.pickCompany')} />
      )}
    </div>
  )
}

function MenuNamesEditor({ companyId }: { companyId: string }) {
  const { t } = useTranslation('admin')
  // The menus' own titles live in the common namespace, where the sidebar reads them.
  const { t: tNav } = useTranslation()
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.PLATFORM_MENU_CONFIG_EDIT)
  const { data: saved, isLoading } = useCompanyMenuLabels(companyId)
  const save = useSaveCompanyMenuLabels(companyId)
  const rows = useMemo(() => flatten(COMPANY_NAV), [])
  // What has been typed since the last save; null while nothing has, so the saved names show as they load.
  const [edits, setEdits] = useState<Record<string, string> | null>(null)

  const draft = edits ?? saved ?? {}
  const next = cleaned(draft)
  const dirty = edits !== null && !sameLabels(next, saved ?? {})
  const tooLong = Object.values(next).some((name) => name.length > MAX_LENGTH)

  async function onSave() {
    try {
      await save.mutateAsync(next)
      setEdits(null)
      toast.success(t('platformConfig.menu.saved'))
    } catch (error) {
      showError(error)
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <SectionCard
        title={t('platformConfig.menu.cardTitle')}
        description={t('platformConfig.menu.cardHelp')}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!dirty || save.isPending} onClick={() => setEdits(null)}>
              {t('platformConfig.menu.discard')}
            </Button>
            <Button size="sm" disabled={!canEdit || !dirty || tooLong || save.isPending} onClick={() => void onSave()}>
              {save.isPending && <Loader2 className="animate-spin" />}
              {t('platformConfig.menu.save')}
            </Button>
          </div>
        }
      >
        <ul className="divide-y">
          {rows.map((row) => {
            const fallback = tNav(row.titleKey)
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
                  aria-label={t('platformConfig.menu.nameFor', { menu: fallback })}
                  disabled={!canEdit}
                  onChange={(e) => setEdits({ ...draft, [row.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canEdit || !value}
                  title={t('platformConfig.menu.reset')}
                  aria-label={t('platformConfig.menu.resetFor', { menu: fallback })}
                  onClick={() => setEdits((({ [row.id]: _removed, ...rest }) => rest)(draft))}
                >
                  <RotateCcw />
                </Button>
              </li>
            )
          })}
        </ul>
      </SectionCard>
  )
}
