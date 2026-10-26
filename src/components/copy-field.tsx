import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as React from "react";

import { IconButton } from "@/components/icon-button";
import { Input } from "@/components/ui/input";

/**
 * A read-only value with a Copy button — a value to paste elsewhere: Superfone's webhook URL and
 * `Authorization` header, Product Ops' CI settings. Monospace, so a secret reads unambiguously.
 */
export function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard (an insecure origin): the field stays selectable for a manual copy.
      document.getElementById(id)?.focus();
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm leading-tight font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <IconButton
          icon={copied ? Check : Copy}
          label={copied ? t("state.copied") : t("action.copyValue", { what: label })}
          onClick={() => void copy()}
        />
      </div>
    </div>
  );
}
