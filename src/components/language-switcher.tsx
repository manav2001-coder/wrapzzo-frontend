import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { currentLocale, LOCALE_LABELS, setLocale, SUPPORTED_LOCALES } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Language picker for the header. The choice is remembered in this browser. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  // Read on every render: `useTranslation` re-renders this on a language change.
  const active = currentLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(className)}
          aria-label={t("field.language")}
          title={LOCALE_LABELS[active]}
        >
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => setLocale(locale)}
            // Native names, not "Hindi" in English: a picker a Hindi speaker cannot read is
            // not a language picker.
            className={cn(locale === active && "font-semibold")}
          >
            {LOCALE_LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
