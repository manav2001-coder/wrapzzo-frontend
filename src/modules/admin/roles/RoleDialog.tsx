import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Role } from '@/api/roles'
import { AppDialog } from '@/components/app-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateRole, useUpdateRole } from '@/hooks/useRoles'

/**
 * Create or edit a role: its name and description. A role grants nothing itself -- what its holders
 * may do is the templates mapped to it, which is the Templates to Role screen's job.
 */
export function RoleDialog({ companyId, role, onClose }: { companyId: string; role?: Role; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const create = useCreateRole(companyId)
  const update = useUpdateRole(companyId)
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const pending = create.isPending || update.isPending

  async function save() {
    const input = { name: name.trim(), description: description.trim() || undefined, active: role?.active ?? true }
    try {
      if (role) await update.mutateAsync({ roleId: role.id, input })
      else await create.mutateAsync(input)
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
      size="md"
      confirmLabel={t('roles.save')}
      onConfirm={() => void save()}
      confirmDisabled={!name.trim() || pending}
      loading={pending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role-name">{t('roles.name')}</Label>
          <Input id="role-name" value={name} maxLength={200} disabled={role?.protectedRole} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-description">{t('roles.description')}</Label>
          <Input id="role-description" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
    </AppDialog>
  )
}
