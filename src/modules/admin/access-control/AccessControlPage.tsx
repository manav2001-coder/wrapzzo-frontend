import { Loader2, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { DesignationAccess } from '@/api/designations'
import { EmptyState } from '@/components/empty-state'
import { Combobox } from '@/components/fields/combobox'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useCompanies } from '@/hooks/useCompanies'
import { useAccessControlCatalog, useDesignationAccess, useDesignations, useReplaceDesignationAccess } from '@/hooks/useDesignations'
import { P } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { groupByModule, withImpliedViews, type AccessModule } from './access-grid'

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((value) => b.has(value))

/**
 * One designation's grants as a grid: a row per module, a checkbox per action. Save replaces the
 * whole set.
 *
 *  - Actions the designation's people already get from their role show ticked and locked, with
 *    the role named -- the role is changed on the user, not here.
 *  - Any action of a module includes its View, so View locks on while another action is ticked.
 */
function DesignationEditor({
  companyId,
  access,
  modules,
}: {
  companyId: string
  access: DesignationAccess
  modules: AccessModule[]
}) {
  const { t } = useTranslation('admin')
  const canEdit = useHasAccess(P.ACCESS_EDIT)
  const replaceAccess = useReplaceDesignationAccess(companyId)
  const showError = useApiErrorToast()
  const saved = useMemo(() => new Set(access.accessControlIds), [access])
  const [checked, setChecked] = useState<Set<string>>(saved)
  const total = modules.reduce((sum, row) => sum + row.actions.length, 0)
  // Each key its people already get from a role, with the role names that grant it.
  const fromRole = useMemo(() => {
    const roles = new Map<string, string[]>()
    for (const role of access.roles ?? []) {
      for (const id of role.accessControlIds) roles.set(id, [...(roles.get(id) ?? []), role.roleName])
    }
    return roles
  }, [access])
  const toSave = useMemo(() => withImpliedViews(checked, modules), [checked, modules])
  const effective = useMemo(() => withImpliedViews(new Set([...checked, ...fromRole.keys()]), modules), [checked, fromRole, modules])
  const roleSummary = (access.roles ?? []).map((role) => t('access.roleCount', { role: role.roleName, count: role.userCount })).join(', ')

  function toggle(id: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function save() {
    try {
      await replaceAccess.mutateAsync({ designation: access.designation, accessControlIds: [...toSave] })
      toast.success(t('access.updated', { designation: access.designation, count: toSave.size }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <SectionCard
      title={access.designation}
      description={
        <>
          {t('access.effective', { count: effective.size, total })}
          {roleSummary && <span className="block">{t('access.rolesHeld', { roles: roleSummary })}</span>}
        </>
      }
      actions={
        canEdit && (
          <Button size="sm" onClick={() => void save()} disabled={sameSet(toSave, saved) || replaceAccess.isPending}>
            {replaceAccess.isPending && <Loader2 className="animate-spin" />}
            {t('access.save')}
          </Button>
        )
      }
    >
      <div role="table" aria-label={t('access.gridLabel', { designation: access.designation })} className="divide-y rounded-md border">
        {modules.map((row) => {
          // View is held for the module's other actions while any of them is on.
          const viewImplied = row.actions.some((action) => action !== row.view && effective.has(action.id))
          return (
            <div key={row.module} role="row" className="grid gap-2 p-3 sm:grid-cols-[200px_1fr] sm:items-center">
              <div role="rowheader" className="text-sm font-medium">
                {row.label}
              </div>
              <div role="cell" className="flex flex-wrap gap-2">
                {row.actions.map((action) => {
                  const roles = fromRole.get(action.id)
                  const lockedByRole = Boolean(roles) && !checked.has(action.id)
                  const lockedByView = action === row.view && viewImplied
                  const on = checked.has(action.id) || lockedByRole || lockedByView
                  const locked = !canEdit || lockedByRole || lockedByView
                  const note = lockedByRole
                    ? t('access.fromRole', { roles: roles!.join(', ') })
                    : lockedByView
                      ? t('access.impliedView')
                      : null
                  return (
                    <label
                      key={action.id}
                      title={[action.description, note].filter(Boolean).join(' -- ')}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm',
                        on && 'border-primary/40 bg-primary/5',
                        locked ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                    >
                      <Checkbox
                        aria-label={`${row.label}: ${action.name}`}
                        checked={on}
                        disabled={locked}
                        onCheckedChange={(next) => toggle(action.id, next === true)}
                      />
                      <span>{action.name}</span>
                      {lockedByRole && <span className="text-xs text-primary">{roles!.join(', ')}</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

/**
 * Designation-level access: every user with a given designation in a company gets these actions on
 * top of their role's (the backend unions the two, see AccessControlCacheService). WHAT they can
 * do is set here; WHICH records they see is their placement in the org tree (Users page).
 */
export function AccessControlPage() {
  const { t } = useTranslation('admin')
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [designation, setDesignation] = useState<string | null>(null)

  const { data: designations } = useDesignations(companyId ?? undefined)
  const { data: catalog } = useAccessControlCatalog()
  const { data: access } = useDesignationAccess(companyId ?? undefined, designation ?? undefined)
  const modules = useMemo(() => groupByModule(catalog ?? []), [catalog])

  const companyOptions = useMemo(() => (companies ?? []).map((c) => ({ value: c.id, label: c.name })), [companies])
  const designationOptions = useMemo(() => (designations ?? []).map((d) => ({ value: d, label: d })), [designations])

  return (
    <div className="space-y-6">
      <MasterPageHeader title={t('access.title')} description={t('access.subtitle')} />

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="access-company">{t('access.company')}</Label>
          <Combobox
            id="access-company"
            options={companyOptions}
            displayValue={(option) => option.label}
            getOptionKey={(option) => option.value}
            value={companyOptions.find((option) => option.value === companyId) ?? null}
            placeholder={t('access.pickCompany')}
            onChange={(next) => {
              setCompanyId((next as { value: string } | null)?.value ?? null)
              setDesignation(null)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-designation">{t('access.designation')}</Label>
          <Combobox
            id="access-designation"
            options={designationOptions}
            displayValue={(option) => option.label}
            getOptionKey={(option) => option.value}
            value={designationOptions.find((option) => option.value === designation) ?? null}
            placeholder={t('access.pickDesignation')}
            disabled={!companyId}
            onChange={(next) => setDesignation((next as { value: string } | null)?.value ?? null)}
          />
        </div>
      </div>

      {companyId && designations?.length === 0 ? (
        <EmptyState icon={ShieldCheck} size="sm" title={t('access.noDesignations')} />
      ) : companyId && access ? (
        <DesignationEditor key={`${companyId}:${access.designation}`} companyId={companyId} access={access} modules={modules} />
      ) : (
        <EmptyState icon={ShieldCheck} size="sm" title={t('access.pickBoth')} />
      )}
    </div>
  )
}
