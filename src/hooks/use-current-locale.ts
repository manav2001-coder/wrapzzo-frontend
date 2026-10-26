import { useTranslation } from "react-i18next";
import { currentLocale, type Locale } from "@/lib/i18n";

/**
 * The active UI locale, reactively. `currentLocale()` (`lib/i18n.ts`) is a plain,
 * one-off read of `i18next.resolvedLanguage` — calling it directly in a render would not
 * update when the user switches language. `useTranslation()` here is only for its
 * subscription (it forces the owning component to re-render on `languageChanged`); the
 * actual resolution is delegated to `currentLocale()` itself rather than re-implemented,
 * because `i18n.language` alone can be an untrimmed tag (`"en-US"`, which is not a member
 * of `SUPPORTED_LOCALES`) where `resolvedLanguage` is already narrowed.
 */
export function useCurrentLocale(): Locale {
  useTranslation();
  return currentLocale();
}
