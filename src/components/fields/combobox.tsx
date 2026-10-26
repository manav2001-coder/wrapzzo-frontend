import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { useController, type Control, type FieldValues, type FieldPath } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export interface ComboboxProps<T> {
  options?: T[];
  /** Async mode — debounced ~300ms. Mutually exclusive with `options` (options wins if both given). */
  onSearch?: (query: string) => Promise<T[]>;
  displayValue: (option: T) => string;
  /**
   * Richer rendering for the option ROW only — the trigger keeps using `displayValue`. Brought
   * to parity with `AsyncCombobox`, which has had this since it shipped. Needed whenever the
   * compact label that fits the trigger is not enough to choose by: a country selector shows
   * "+1" collapsed, but "+1" alone cannot distinguish the US from Canada in the list.
   */
  renderOption?: (option: T) => React.ReactNode;
  /**
   * Richer rendering for the single-select TRIGGER — the counterpart of `renderOption`.
   * `displayValue` must stay a string (it keys, filters and names the chips), so anything that
   * is not text, like a flag image, has nowhere else to go.
   */
  renderValue?: (option: T) => React.ReactNode;
  /**
   * Width/styling for the dropdown, which by default matches the trigger
   * (`--radix-popover-trigger-width`). A narrow trigger then clips its own option list — a
   * country selector is 8rem wide but its options are country names. Override to decouple them.
   */
  contentClassName?: string;
  getOptionKey?: (option: T) => string;
  multiple?: boolean;
  value: T | T[] | null;
  onChange: (value: T | T[] | null) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Inline "add new" row above the list, as `AsyncCombobox` has it. */
  addNew?: { label: string; onAdd: (currentSearch: string) => void };
  /**
   * Injected by `FormControl`, which clones its child with `id`/`aria-describedby`/
   * `aria-invalid`. They must land on the FOCUSABLE element, not on a wrapper `<div>`:
   * `FormLabel`'s `htmlFor` points at that id, and a `<div>` is not a labelable element — so
   * clicking the label focused nothing and `getByLabelText` could not find the field. See the
   * same note on `phone-field.tsx`, the one field that already solved this.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Same bridge as `AsyncCombobox`/`LookupCombobox` — a `render` field (or any caller with no
   * `<label htmlFor>` wired to this control) has no other way to name the trigger. */
  "aria-label"?: string;
  className?: string;
  /** Merged onto the trigger button — `className` styles the wrapper, which a trigger on a
   * non-`background` surface (the sign-in panel) cannot be recoloured through. */
  triggerClassName?: string;
}

/**
 * Standard shadcn combobox recipe (Popover + Command). Deliberately does not port v4's
 * URL-auto-fetcher/response-shape parsing, request cache, or infinite scroll — `onSearch`
 * is the sanctioned extension point for wiring a real paginated API later.
 */
export function Combobox<T>({
  options: staticOptions,
  onSearch,
  displayValue,
  renderOption,
  renderValue,
  contentClassName,
  getOptionKey,
  multiple,
  value,
  onChange,
  placeholder = "Select…",
  emptyText = "No results.",
  disabled,
  loading: externalLoading,
  addNew,
  className,
  triggerClassName,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: ComboboxProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [asyncOptions, setAsyncOptions] = React.useState<T[]>([]);
  const [searching, setSearching] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const options = staticOptions ?? asyncOptions;
  const isLoading = externalLoading || searching;

  const keyOf = React.useCallback(
    (option: T) => getOptionKey?.(option) ?? displayValue(option),
    [getOptionKey, displayValue],
  );

  const selected: T[] = multiple ? ((value as T[] | null) ?? []) : value ? [value as T] : [];
  const selectedKeys = new Set(selected.map(keyOf));

  React.useEffect(() => {
    if (!onSearch || staticOptions) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      onSearch(query)
        .then(setAsyncOptions)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, onSearch, staticOptions]);

  const handleSelect = (option: T) => {
    if (multiple) {
      const key = keyOf(option);
      const next = selectedKeys.has(key)
        ? selected.filter((o) => keyOf(o) !== key)
        : [...selected, option];
      onChange(next);
    } else {
      onChange(option);
      setOpen(false);
    }
  };

  const removeChip = (option: T) => {
    onChange(selected.filter((o) => keyOf(o) !== keyOf(option)));
  };

  const triggerLabel = multiple
    ? placeholder
    : selected.length > 0
      ? (renderValue ?? displayValue)(selected[0]!)
      : placeholder;

  return (
    <div className={cn("space-y-2", className)}>
      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <Badge key={keyOf(option)} variant="secondary" className="gap-1 pr-1">
              {displayValue(option)}
              {/* A disabled control shows its value and cannot change it — the × included. */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeChip(option)}
                  aria-label={`Remove ${displayValue(option)}`}
                  className="rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              selected.length === 0 && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}>
          <Command shouldFilter={!onSearch}>
            <CommandInput
              placeholder={t("a11y.searchPlaceholder")}
              value={query}
              onValueChange={setQuery}
            />
            {addNew && (
              <button
                type="button"
                onClick={() => addNew.onAdd(query)}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-sm text-primary hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                {addNew.label}
              </button>
            )}
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && <CommandEmpty>{emptyText}</CommandEmpty>}
              <CommandGroup>
                {options.map((option) => {
                  const key = keyOf(option);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      /*
                       * cmdk filters on `value`, and `value` is the KEY — deliberately,
                       * because two options may share a label and the value is what
                       * identifies the selection. Without `keywords` that made the search
                       * box match nothing a user can see: `selectField` passes
                       * `option.value` as the key, so a tank picker filtered on uuids and
                       * a station-type picker on `OWN_DEPOT_PUMP`, and typing the label on
                       * screen emptied the list.
                       *
                       * `keywords` adds matchable text without touching identity. Found by
                       * an e2e spec typing "T1" into a tank picker and getting nothing —
                       * every local combobox in the app had the same broken search.
                       */
                      keywords={[displayValue(option)]}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedKeys.has(key) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {renderOption ? renderOption(option) : displayValue(option)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface ControlledComboboxProps<TFieldValues extends FieldValues, T> extends Omit<
  ComboboxProps<T>,
  "value" | "onChange"
> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
}

/**
 * Self-binding variant for use as a `fieldKind: "custom"` field inside DynamicFieldList/
 * FormGenerator — calls RHF's useController itself instead of taking value/onChange props,
 * mirroring v4's "CustomAutocomplete manages its own form binding" behavior explicitly
 * rather than via displayName-matching.
 */
export function ControlledCombobox<TFieldValues extends FieldValues, T>({
  name,
  control,
  ...props
}: ControlledComboboxProps<TFieldValues, T>) {
  const { field } = useController({ name, control });
  return <Combobox {...props} value={field.value ?? null} onChange={field.onChange} />;
}
