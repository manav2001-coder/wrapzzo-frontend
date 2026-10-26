import { useTranslation } from "react-i18next";

import * as React from "react";
import { ChevronDown, ListFilter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormGenerator } from "@/components/fields/form-generator";
import { buildFilterFields } from "@/components/data-table/build-filter-fields";
import { filterChipLabel, isActiveFilterValue } from "@/components/data-table/filter-chip-label";
import type { TableFilterField } from "@/components/data-table/types";

interface TableFilterPanelProps {
  fields: TableFilterField[];
  activeFilters: Record<string, unknown>;
  onApply: (values: Record<string, unknown>) => void;
  onClear: () => void;
}

/**
 * The page-level filter panel: an inline expandable form above the table.
 *
 * Inline rather than a drawer, following v4's own note that it "replaces the side drawer with a
 * more accessible inline panel" — and the body is a real `FormGenerator` in `mode="filter"`,
 * so a `select` is a combobox and a `dateRange` is a range picker. It used to render a plain
 * `<Input>` for every declared type, which made four of the five types unusable, and it had no
 * consumer at all.
 *
 * Two deliberate departures from v4:
 *
 * - **Values stay flat.** No `<key>_label` shadow entries — a chip resolves its label from the
 *   field's own `options` (see `filterChipLabel`).
 * - **A range is one filter.** The field's `type` selects the SQL operator centrally
 *   (`panelFilterVariant`), instead of each screen declaring `_from`/`_to` phantom fields and
 *   folding them into a `between` inside its own `fetchData`.
 *
 * `mode="filter"` also means Field Config never sees these fields, which is correct: the
 * registry configures an entity's PERSISTED fields, and a filter has no stored value.
 *
 * **When to reach for this, and when not to.** Every column published in `LIST_FIELDS` already
 * gets its own header filter automatically, so a panel repeating those would put two controls
 * on one filter — which is how they end up disagreeing. No master screen passes
 * `tableFilterComponents` today for exactly that reason. The panel earns its place when a
 * filter has NO column to hang off:
 *
 * - a published field the listing deliberately does not show (`user.employeeId`),
 * - a filter over something that is not a column at all (a joined or computed value),
 * - a set of filters a user sets together and applies in ONE refetch, rather than N.
 */
export function TableFilterPanel({
  fields,
  activeFilters,
  onApply,
  onClear,
}: TableFilterPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const formFields = React.useMemo(() => buildFilterFields(fields, t), [fields, t]);

  const activeEntries = Object.entries(activeFilters).filter(([, value]) =>
    isActiveFilterValue(value),
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <ListFilter aria-hidden className="h-3.5 w-3.5" />
            {t("action.filters")}
            {activeEntries.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {activeEntries.length}
              </Badge>
            )}
            <ChevronDown aria-hidden className="h-3.5 w-3.5" />
          </Button>
        </CollapsibleTrigger>
        {!open &&
          activeEntries.map(([key, value]) => {
            const field = fields.find((entry) => entry.id === key);
            return (
              <Badge key={key} variant="outline" className="gap-1">
                <span className="max-w-[16rem] truncate">
                  {field?.label ?? key}: {filterChipLabel(field, value)}
                </span>
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={t("action.remove")}
                  onClick={() => onApply({ ...activeFilters, [key]: undefined })}
                >
                  <X aria-hidden className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
      </div>
      <CollapsibleContent className="mt-3 rounded-md border border-border p-3">
        <FormGenerator
          maxWidgetsPerRow={3}
          mode="filter"
          hideCardWrapper
          buttonAlignment="end"
          fields={formFields}
          // Keyed by the applied filters so re-opening the panel shows what is in force,
          // including a chip the user removed while it was collapsed.
          values={activeFilters}
          onSubmit={(values) => {
            onApply(values);
            setOpen(false);
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t("action.clearAll")}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
