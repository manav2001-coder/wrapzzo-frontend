import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { CompanyUser } from '@/api/users'
import { AppDialog } from '@/components/app-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCompanyOrgUnits, useSetExtraOrgUnits } from '@/hooks/useUsers'

/**
 * Pick the org units a user covers beyond their own -- a manager over several zones. Ticking a
 * unit covers everything under it too, so the list is grouped by level. What is already covered --
 * the user's own unit and everything under it, and everything under a unit ticked here -- shows
 * ticked and locked, so the boxes always say what the user can see. Replace-all on save.
 */
export function ExtraOrgUnitsDialog({ companyId, user, onClose }: { companyId: string; user: CompanyUser; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const { data: units, isLoading } = useCompanyOrgUnits(companyId)
  const save = useSetExtraOrgUnits(companyId)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(user.extraOrgUnits.map((unit) => unit.id)))

  const byLevel = useMemo(() => {
    const groups = new Map<string, { id: string; name: string }[]>()
    for (const unit of units ?? []) groups.set(unit.levelName, [...(groups.get(unit.levelName) ?? []), unit])
    for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return [...groups.entries()]
  }, [units])

  // A unit is covered when it is the user's own, or sits under their own or under a ticked one.
  const covered = useMemo(() => {
    const parentOf = new Map((units ?? []).map((unit) => [unit.id, unit.parentId]))
    const roots = new Set([...selected, ...(user.orgUnitId ? [user.orgUnitId] : [])])
    const result = new Set<string>()
    for (const unit of units ?? []) {
      if (unit.id === user.orgUnitId) result.add(unit.id)
      for (let ancestor = parentOf.get(unit.id); ancestor; ancestor = parentOf.get(ancestor)) {
        if (roots.has(ancestor)) {
          result.add(unit.id)
          break
        }
      }
    }
    return result
  }, [units, selected, user.orgUnitId])

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function submit() {
    try {
      await save.mutateAsync({ userId: user.id, orgUnitIds: [...selected] })
      toast.success(t('users.extraUnits.saved', { name: user.name }))
      onClose()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={t('users.extraUnits.title', { name: user.name })}
      description={t('users.extraUnits.body', { name: user.name, unit: user.orgUnitName ?? t('users.extraUnits.noOwnUnit') })}
      confirmLabel={t('users.extraUnits.save')}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      loading={save.isPending}
      onConfirm={() => void submit()}
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : byLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('users.extraUnits.none')}</p>
      ) : (
        <div className="max-h-80 space-y-4 overflow-y-auto">
          {byLevel.map(([level, list]) => (
            <fieldset key={level}>
              <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{level}</legend>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {list.map((unit) => {
                  const id = `extra-unit-${unit.id}`
                  const isCovered = covered.has(unit.id)
                  return (
                    <label key={unit.id} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                      <Checkbox
                        id={id}
                        checked={isCovered || selected.has(unit.id)}
                        disabled={isCovered}
                        onCheckedChange={(checked) => toggle(unit.id, checked === true)}
                      />
                      {unit.name}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </AppDialog>
  )
}
