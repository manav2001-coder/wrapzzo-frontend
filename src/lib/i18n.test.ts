import { afterEach, describe, expect, it } from 'vitest'

import {
  currentLocale,
  i18next,
  initI18n,
  isSupportedLocale,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  resources,
  setLocale,
  SUPPORTED_LOCALES,
  usableLocale,
} from './i18n'

/** Every leaf key in a nested catalog, dotted. */
function keysOf(object: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('catalogs', () => {
  it('ships every namespace in every language', () => {
    const namespaces = Object.keys(resources.en).sort()
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(resources[locale]).sort()).toEqual(namespaces)
    }
  })

  // Namespaces are derived from `resources`, never listed: a hand-kept list silently stops
  // covering a namespace someone forgot to add to it.
  it.each(Object.keys(resources.en))('%s has exactly the English keys in every language', (ns) => {
    const english = keysOf(resources.en[ns as keyof typeof resources.en]).sort()
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = resources[locale][ns as keyof (typeof resources)[typeof locale]]
      expect(keysOf(catalog).sort(), `${locale}/${ns}`).toEqual(english)
    }
  })

  it('labels every language in its own script', () => {
    expect(Object.keys(LOCALE_LABELS).sort()).toEqual([...SUPPORTED_LOCALES].sort())
  })
})

describe('locale helpers', () => {
  afterEach(() => {
    void i18next.changeLanguage('en')
  })

  it('recognises only shipped locales', () => {
    expect(isSupportedLocale('hi')).toBe(true)
    expect(isSupportedLocale('fr')).toBe(false)
    expect(isSupportedLocale(undefined)).toBe(false)
  })

  it('switches language and remembers it in this browser', () => {
    initI18n()
    setLocale('hi')
    expect(currentLocale()).toBe('hi')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('hi')
  })

  it('rejects a tag Intl would throw on instead of crashing render', () => {
    expect(usableLocale('en-US@posix')).toBeUndefined()
    expect(usableLocale('en-IN')).toBe('en-IN')
    expect(usableLocale(null)).toBeUndefined()
  })
})
