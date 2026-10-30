import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Role } from '@/api/roles'
import type { AccessTemplate } from '@/api/templates'
import { AppDialog } from '@/components/app-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateRole, useReplaceRoleTemplates, useUpdateRole } from '@/hooks/useRoles'
import { cn } from '@/lib/utils'

/**
 * Create or edit a role and choose the templates it carries. A role grants nothing itself: what
 * its holders may do is the union of its templates (and what those include). Company Admin and
 * Member keep their names, but their templates can still be changed.
 */
export function RoleDialog({
  companyId,
  role,
  templates,
  canEdit,
  onClose,
}: {
  companyId: string
  /** Undefined to create. */
  role?: Role
  templates: AccessTemplate[]
  canEdit: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const create = useCreateRole(companyId)
  const update = useUpdateRole(companyId)
  const replaceTemplates = useReplaceRoleTemplates(companyId)
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.templateIds))
  const pending = create.isPending || update.isPending || replaceTemplates.isPending

  function toggle(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function save() {
    const input = { name: name.trim(), description: description.trim() || undefined, active: role?.active ?? true }
    try {
      if (role) {
        await update.mutateAsync({ roleId: role.id, input })
        await replaceTemplates.mutateAsync({ roleId: role.id, templateIds: [...selected] })
      } else {
        await create.mutateAsync({ ...input, templateIds: [...selected] })
      }
      toast.success(t('roles.saved', { name: input.name }))
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={role ? t('roles.editTitle', { name: role.name }) : t('roles.newTitle')}
      description={t('roles.dialogHint')}
      size="lg"
      confirmLabel={t('roles.save')}
      onConfirm={() => void save()}
      confirmDisabled={!canEdit || !name.trim() || pending}
      loading={pending}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">{t('roles.name')}</Label>
            <Input id="role-name" value={name} maxLength={200} disabled={!canEdit || role?.protectedRole} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-description">{t('roles.description')}</Label>
            <Input id="role-description" value={description} maxLength={500} disabled={!canEdit} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('roles.templates')}</legend>
          <p className="text-xs text-muted-foreground">{t('roles.templatesHint')}</p>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('roles.noTemplates')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {templates
                .filter((template) => template.active)
                .map((template) => (
                  <label
                    key={template.id}
                    className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', selected.has(template.id) && 'border-primary/40 bg-primary/5', canEdit ? 'cursor-pointer' : 'cursor-not-allowed')}
                  >
                    <Checkbox aria-label={template.name} checked={selected.has(template.id)} disabled={!canEdit} onCheckedChange={(next) => toggle(template.id, next === true)} />
                    <span>{template.name}</span>
                    {template.system && <span className="text-xs text-primary">{t('templates.systemBadge')}</span>}
                  </label>
                ))}
            </div>
          )}
        </fieldset>
      </div>
    </AppDialog>
  )
}
