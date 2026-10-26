"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

/**
 * `className` is forwarded so the toggle can sit on the fixed dark-navy surfaces (the
 * landing header), where the ghost variant's `text-foreground` is near-invisible in light
 * mode. Callers on ordinary surfaces pass nothing and get the previous behaviour.
 */
export function ThemeToggle({ className }: { className?: string } = {}) {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(className)}
      aria-label={t("a11y.toggleTheme")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
