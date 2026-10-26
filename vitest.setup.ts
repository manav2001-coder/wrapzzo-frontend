/// <reference types="node" />
// Adds jest-dom matchers (toBeInTheDocument, toHaveClass, …) to Vitest's expect.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Initialise i18next for the whole run. `useTranslation` falls back to the GLOBAL instance when
// there is no <I18nextProvider> above it, and an uninitialised instance returns the raw key.
import { initI18n } from '@/lib/i18n'

initI18n()

// Pin the Intl default locale and timezone, so formatted dates don't depend on the machine.
const TEST_LOCALE = 'en-IN'
process.env.TZ = 'Asia/Kolkata'

const NativeDateTimeFormat = Intl.DateTimeFormat
// A Proxy, not a subclass: `Intl.DateTimeFormat` is callable both with and without `new`.
Intl.DateTimeFormat = new Proxy(NativeDateTimeFormat, {
  construct: (target, [locale, options]) => new target(locale ?? TEST_LOCALE, options),
  apply: (target, _this, [locale, options]) => target(locale ?? TEST_LOCALE, options),
}) as typeof Intl.DateTimeFormat

// jsdom has no ResizeObserver — cmdk (Command, used by Combobox) observes element size on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// jsdom implements none of these; cmdk, Radix Select, ScrollTop and FullscreenToggle call them.
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollTo ??= () => {}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: readonly number[] = []
}
globalThis.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver

// jsdom has no matchMedia; next-themes reads `prefers-color-scheme` through it. Never matching
// means "light" and "no reduced motion", the same as a default browser.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

document.documentElement.requestFullscreen ??= async () => {}
document.exitFullscreen ??= async () => {}
if (!Object.getOwnPropertyDescriptor(Document.prototype, 'fullscreenElement')?.set) {
  Object.defineProperty(document, 'fullscreenElement', { writable: true, configurable: true, value: null })
}

// localStorage persists by design (sidebar state, table layout, locale) — clear it between tests
// so one test's write never leaks into the next.
afterEach(() => {
  localStorage.clear()
})
