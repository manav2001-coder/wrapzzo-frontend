import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { CompanyUser } from '@/api/users'
import { AppDialog } from '@/components/app-dialog'
import { Combobox } from '@/components/fields/combobox'
import { Label } from '@/components/ui/label'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useRoles } from '@/hooks/useRoles'
import { useRemoveCompanyAdmin } from '@/hooks/useUsers'

/**
 * Takes Company Admin away from someone. A company has no default role to fall back to, so this
 * asks which of its roles they move to.
 */
export function RemoveAdminDialog({ companyId, user, onClose }: { companyId: string; user: CompanyUser; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const { data: roles } = useRoles(companyId)
  const removeAdmin = useRemoveCompanyAdmin(companyId)
  const [roleId, setRoleId] = useState<string | null>(null)
  const options = useMemo(
    () => (roles ?? []).filter((role) => role.active && !role.protectedRole).map((role) => ({ value: role.id, label: role.name })),
    [roles],
  )

  async function confirm() {
    try {
      await removeAdmin.mutateAsync({ userId: user.id, roleId: roleId! })
      toast.success(t('users.removedAdmin', { name: user.name }))
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title={t('users.removeAdmin')}
      description={t('users.removeAdminBody', { name: user.name })}
      confirmLabel={t('users.removeAdmin')}
      cancelLabel={t('action.cancel', { ns: 'common' })}
      confirmDisabled={!roleId}
      loading={removeAdmin.isPending}
      onConfirm={() => void confirm()}
    >
      <div className="space-y-1.5">
        <Label htmlFor="remove-admin-role">{t('users.removeAdminRole')}</Label>
        <Combobox
          id="remove-admin-role"
          options={options}
          displayValue={(option) => option.label}
          getOptionKey={(option) => option.value}
          value={options.find((option) => option.value === roleId) ?? null}
          placeholder={t('users.removeAdminPick')}
          onChange={(next) => setRoleId((next as { value: string } | null)?.value ?? null)}
        />
        {options.length === 0 && <p className="text-xs text-muted-foreground">{t('users.removeAdminNoRoles')}</p>}
      </div>
    </AppDialog>
  )
}
