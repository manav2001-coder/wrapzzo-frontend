import { useTranslation } from 'react-i18next'

import { setupPassword } from '@/api/auth'
import { SetPasswordPanel } from '@/components/set-password-panel'

/** For bulk-imported (or otherwise password-less) company and platform users. */
export function SetupPasswordPage() {
  const { t } = useTranslation('auth')
  return <SetPasswordPanel setup={setupPassword} subtitle={t('setPassword.subtitle')} />
}
