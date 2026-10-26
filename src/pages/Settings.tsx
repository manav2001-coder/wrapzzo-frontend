import * as React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { Combobox } from '@/components/fields/combobox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentLocale } from '@/hooks/use-current-locale'
import { LOCALE_LABELS, setLocale, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'

const MODES = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const

const LANGUAGE_OPTIONS = SUPPORTED_LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] }))

/**
 * Appearance and language for this browser, as MobixFL's Settings screen lays them out. Wrapzzo
 * keeps both per browser (next-themes and the i18n detector's localStorage), so each applies the
 * moment it is picked -- there is no profile to save them to.
 */
export default function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const locale = useCurrentLocale()

  // next-themes only knows the stored theme after mount; rendering before that flashes the wrong
  // button as selected.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.appearance')}</CardTitle>
          <CardDescription>{t('settings.appearanceHelp')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!mounted ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {MODES.map(({ value, icon: Icon }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                >
                  <Icon />
                  {t(`settings.theme.${value}`)}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('field.language')}</CardTitle>
          <CardDescription>{t('settings.languageHelp')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="settings-language">{t('field.language')}</Label>
            <Combobox
              id="settings-language"
              options={LANGUAGE_OPTIONS}
              displayValue={(option) => option.label}
              value={LANGUAGE_OPTIONS.find((option) => option.value === locale) ?? null}
              onChange={(next) => {
                const picked = next as { value: Locale } | null
                if (picked) setLocale(picked.value)
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
