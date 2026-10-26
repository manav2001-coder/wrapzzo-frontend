import i18next, { type i18n as I18n } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import admin_en from '@/locales/en/admin.json'
import auth_en from '@/locales/en/auth.json'
import common_en from '@/locales/en/common.json'
import gifts_en from '@/locales/en/gifts.json'
import orders_en from '@/locales/en/orders.json'
import public_en from '@/locales/en/public.json'
import vendor_en from '@/locales/en/vendor.json'
import admin_hi from '@/locales/hi/admin.json'
import auth_hi from '@/locales/hi/auth.json'
import common_hi from '@/locales/hi/common.json'
import gifts_hi from '@/locales/hi/gifts.json'
import orders_hi from '@/locales/hi/orders.json'
import public_hi from '@/locales/hi/public.json'
import vendor_hi from '@/locales/hi/vendor.json'

/**
 * i18n for the app's UI, set up the way MobixFL's is: one namespace per area (a namespace is the
 * unit of authoring), catalogs imported statically (all of them together are a few KB), and every
 * missing key falling back to English key by key, so a partial catalog renders English for the
 * gaps instead of raw key names.
 *
 * Adding a language is a new `locales/<code>/` folder, an entry in `SUPPORTED_LOCALES` and
 * `LOCALE_LABELS`, and its catalogs in `resources`. `i18n.test.ts` checks every catalog has
 * exactly English's keys.
 */

export const SUPPORTED_LOCALES = ['en', 'hi'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'wrapzzo.locale'

/** Native names: a language picker that lists "Hindi" in English helps nobody. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
}

export const defaultNS = 'common'

export const resources = {
  en: { common: common_en, auth: auth_en, admin: admin_en, orders: orders_en, public: public_en, gifts: gifts_en, vendor: vendor_en },
  hi: { common: common_hi, auth: auth_hi, admin: admin_hi, orders: orders_hi, public: public_hi, gifts: gifts_hi, vendor: vendor_hi },
} as const

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

let initialized = false

/**
 * Initialise once. Idempotent so a hot reload, or a test importing this module twice, does not
 * re-register the plugins and reset the current language mid-render.
 */
export function initI18n(): I18n {
  if (initialized) return i18next
  initialized = true

  void i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      defaultNS,
      ns: Object.keys(resources.en),
      fallbackLng: 'en',
      supportedLngs: [...SUPPORTED_LOCALES],
      // "hi-IN" from the browser must resolve to the "hi" catalog, not miss entirely.
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false }, // React already escapes.
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
        caches: ['localStorage'],
      },
      returnNull: false,
    })

  return i18next
}

/** Switch language and remember it in this browser. */
export function setLocale(locale: Locale): void {
  if (i18next.language === locale) return
  void i18next.changeLanguage(locale)
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Private mode / storage disabled: the language still applies for this session.
  }
}

/**
 * A locale tag `Intl` will actually accept, or `undefined` meaning "use the host default". An
 * unusable tag (a headless browser's `en-US@posix`) does not degrade, it THROWS from inside
 * render, so every `Intl`/`localeCompare` call goes through this.
 */
export function usableLocale(tag: string | undefined | null): string | undefined {
  if (!tag) return undefined
  try {
    return Intl.getCanonicalLocales(tag)[0]
  } catch {
    return undefined
  }
}

export function currentLocale(): Locale {
  const base = i18next.resolvedLanguage ?? i18next.language ?? 'en'
  return isSupportedLocale(base) ? base : 'en'
}

export { i18next }
