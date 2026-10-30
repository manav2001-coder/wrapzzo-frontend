import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { SYSTEM_SCOPE, useAccessCompany } from '@/hooks/useAccessCompany'
import { CompanyPicker } from './CompanyPicker'

/**
 * The company scope for a TBAC screen. Platform staff pick a company -- or, where `allowSystem`,
 * none, which shows the system (shared) records; a company user works on their own company and
 * sees no picker.
 */
export function ScopeBar({ id, allowSystem = false }: { id: string; allowSystem?: boolean }) {
  const { t } = useTranslation('admin')
  const { isPlatformStaff, isSystem, picked, setPicked } = useAccessCompany()
  if (!isPlatformStaff) return null

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <CompanyPicker id={id} value={picked} onChange={setPicked} />
      {allowSystem && !isSystem && picked && (
        <Button size="sm" variant="ghost" onClick={() => setPicked(SYSTEM_SCOPE)}>
          <X />
          {t('access.showSystem')}
        </Button>
      )}
    </div>
  )
}
