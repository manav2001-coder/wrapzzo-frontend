import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { AccessTemplate } from '@/api/templates'
import { AppDialog } from '@/components/app-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { assignableFeatures, useCreateTemplate, useFeatures, useUpdateTemplate } from '@/hooks/useTemplates'
import { cn } from '@/lib/utils'
import { groupByModule, withImpliedViews } from './access-grid'

/**
 * Create or edit one template: its name, the keys it grants itself (a module/action grid, any
 * action ticking its View), and the other templates it includes. `companyId` null means a system
 * master template. Saving replaces the template's whole contents.
 */
export function TemplateDialog({
  companyId,
  template,
  others,
  onClose,
}: {
  companyId: string | null
  /** Undefined to create. */
  template?: AccessTemplate
  /** Templates that could be included: same scope, never the template itself. */
  others: AccessTemplate[]
  onClose: () => void
}) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const { data: scopeFeatures } = useFeatures(companyId ?? undefined)
  const create = useCreateTemplate(companyId)
  const update = useUpdateTemplate()
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [active, setActive] = useState(template?.active ?? true)
  const [keys, setKeys] = useState<Set<string>>(() => new Set(template?.accessControlIds))
  const [includes, setIncludes] = useState<Set<string>>(() => new Set(template?.referencedTemplateIds))

  // A company template carries what the company has registered and on; a system template, anything in the catalogue.
  const modules = useMemo(() => groupByModule(assignableFeatures(scopeFeatures)), [scopeFeatures])
  const withViews = useMemo(() => withImpliedViews(keys, modules), [keys, modules])
  const candidates = others.filter((other) => other.id !== template?.id && other.active)
  const pending = create.isPending || update.isPending

  function flip(setter: typeof setKeys, id: string, on: boolean) {
    setter((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function save() {
    const input = { name: name.trim(), description: description.trim() || undefined, active, accessControlIds: [...withViews], referencedTemplateIds: [...includes] }
    try {
      if (template) await update.mutateAsync({ templateId: template.id, input })
      else await create.mutateAsync(input)
      toast.success(t('templates.saved', { name: input.name }))
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={template ? t('templates.editTitle', { name: template.name }) : t('templates.newTitle')}
      description={t('templates.dialogHint')}
      size="xl"
      confirmLabel={t('templates.save')}
      onConfirm={() => void save()}
      confirmDisabled={!name.trim() || pending}
      loading={pending}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">{t('templates.name')}</Label>
            <Input id="template-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-description">{t('templates.description')}</Label>
            <Input id="template-description" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={active} onCheckedChange={setActive} aria-label={t('templates.active')} />
            {t('templates.active')}
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('templates.grants')}</legend>
          <div role="table" aria-label={t('templates.gridLabel')} className="divide-y rounded-md border">
            {modules.map((row) => {
              const viewImplied = row.actions.some((action) => action !== row.view && withViews.has(action.id))
              return (
                <div key={row.module} role="row" className="grid gap-2 p-3 sm:grid-cols-[200px_1fr] sm:items-center">
                  <div role="rowheader" className="text-sm font-medium">{row.label}</div>
                  <div role="cell" className="flex flex-wrap gap-2">
                    {row.actions.map((action) => {
                      const lockedByView = action === row.view && viewImplied
                      const on = keys.has(action.id) || lockedByView
                      return (
                        <label
                          key={action.id}
                          title={[action.description, lockedByView ? t('access.impliedView') : null].filter(Boolean).join(' -- ')}
                          className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', on && 'border-primary/40 bg-primary/5', lockedByView ? 'cursor-not-allowed' : 'cursor-pointer')}
                        >
                          <Checkbox
                            aria-label={`${row.label}: ${action.name}`}
                            checked={on}
                            disabled={lockedByView}
                            onCheckedChange={(next) => flip(setKeys, action.id, next === true)}
                          />
                          <span>{action.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('templates.includes')}</legend>
          <p className="text-xs text-muted-foreground">{t('templates.includesHint')}</p>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('templates.noneToInclude')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {candidates.map((other) => (
                <label key={other.id} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', includes.has(other.id) && 'border-primary/40 bg-primary/5')}>
                  <Checkbox aria-label={other.name} checked={includes.has(other.id)} onCheckedChange={(next) => flip(setIncludes, other.id, next === true)} />
                  <span>{other.name}</span>
                  {other.system && <span className="text-xs text-primary">{t('templates.systemBadge')}</span>}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>
    </AppDialog>
  )
}
