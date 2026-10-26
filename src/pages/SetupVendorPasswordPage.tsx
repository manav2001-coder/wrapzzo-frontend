import { useTranslation } from 'react-i18next'

import { setupVendorPassword } from '@/api/vendorAuth'
import { SetPasswordPanel } from '@/components/set-password-panel'

/** A vendor's invite link, onboarded by Wrapzzo or by a company admin. */
export function SetupVendorPasswordPage() {
  const { t } = useTranslation('auth')
  return <SetPasswordPanel setup={setupVendorPassword} subtitle={t('setPassword.vendorSubtitle')} />
}
