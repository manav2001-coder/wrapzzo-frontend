import { useEffect } from 'react'
import { useAppSelector } from '@/app/hooks'
import { applyTheme, resolveTheme } from '@/lib/theme'

export function useThemeSync() {
  const preference = useAppSelector((state) => state.ui.theme)

  useEffect(() => {
    applyTheme(resolveTheme(preference))

    if (preference !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(resolveTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])
}
