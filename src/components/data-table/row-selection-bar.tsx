import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface RowSelectionBarProps {
  count: number;
  onClear: () => void;
}

export function RowSelectionBar({ count, onClear }: RowSelectionBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <span>{t("table.selectedCount", { count })}</span>
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t("action.clear")}
      </Button>
    </div>
  );
}
