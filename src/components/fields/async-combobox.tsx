import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import type { QueryKey } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { usePaginatedList, type PaginatedPage } from "@/hooks/use-paginated-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export interface AsyncComboboxProps<T> {
  /** react-query cache scope. The search term and page size are appended automatically. */
  queryKey: QueryKey;
  fetchPage: (params: {
    page: number;
    pageSize: number;
    search: string;
    signal?: AbortSignal;
  }) => Promise<PaginatedPage<T>>;
  pageSize?: number;
  minSearchLength?: number;
  staleTime?: number;
  displayValue: (option: T) => string;
  /**
   * REQUIRED here, unlike on `Combobox`: paging needs stable identity to dedupe rows
   * across pages and to keep a selected row ticked when a later page re-sends it.
   */
  getOptionKey: (option: T) => string;
  getOptionDisabled?: (option: T) => boolean;
  renderOption?: (option: T) => React.ReactNode;
  multiple?: boolean;
  value: T | T[] | null;
  onChange: (value: T | T[] | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Inline "add new" row — v4's `CustomAddButtonInAutocomplete`. */
  addNew?: { label: string; onAdd: (currentSearch: string) => void };
  scrollThreshold?: number;
  /**
   * Hard cap on rendered rows, after which a "refine your search" row appears. This is
   * the cheap alternative to windowing: cmdk drives filtering and arrow-key traversal off
   * mounted DOM nodes, so unmounting off-screen rows breaks both. (v4's
   * `VirtualizedListbox` did not virtualize either — it rendered every child verbatim.)
   */
  maxRenderedOptions?: number;
  /** Bump to drop cached pages and refetch — v4's `cacheInvalidationKey`. */
  cacheKey?: string | number;
  /**
   * Injected by `FormControl`, which clones its child with `id`/`aria-describedby`/
   * `aria-invalid`. They must land on the FOCUSABLE element, not on a wrapper `<div>`:
   * `FormLabel`'s `htmlFor` points at that id, and a `<div>` is not a labelable element — so
   * clicking the label focused nothing and `getByLabelText` could not find the field. See the
   * same note on `phone-field.tsx`, the one field that already solved this.
   */
  id?: string;
  "aria-describedby"?: string;
  /**
   * An accessible name for the trigger, where no `<label>` points at it.
   *
   * Every master drawer gets its name from `FormLabel`'s `htmlFor`, so this is unset there.
   * A control rendered inside a `FormGenerator` `render` field has no label at all, though —
   * the purchase order's line grid is the first — and without this the trigger is announced
   * as an unnamed combobox. The FIFTH prop this bridge chain has silently dropped; the
   * others are in `field-accessibility.test.tsx`.
   */
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Combobox over a PAGINATED source: opens, fetches page 0, and pages in more as the list
 * is scrolled.
 *
 * A sibling of `Combobox` rather than another mode of it, deliberately. `useInfiniteQuery`
 * is provider-bound and cannot be called conditionally, so folding paging into `Combobox`
 * would force every static-options usage to sit inside a `QueryClientProvider`. v4's
 * `CustomAutocomplete` reached 1033 LOC by making `options` / `onSearch` /
 * `fetchPaginatedOptions` a runtime branch instead of a type; two components make the
 * exclusivity a compile-time fact.
 */
export function AsyncCombobox<T>({
  queryKey,
  fetchPage,
  pageSize = 20,
  minSearchLength = 0,
  staleTime,
  displayValue,
  getOptionKey,
  getOptionDisabled,
  renderOption,
  multiple,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  className,
  addNew,
  scrollThreshold,
  maxRenderedOptions = 300,
  cacheKey,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: AsyncComboboxProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  // cmdk's highlight is controlled so appending a page doesn't snap it back to the top.
  const [highlighted, setHighlighted] = React.useState("");

  const scopedKey = React.useMemo<QueryKey>(
    () => (cacheKey === undefined ? queryKey : [...queryKey, cacheKey]),
    [queryKey, cacheKey],
  );

  const { items, isLoading, isLoadingMore, hasMore, error, onScroll } = usePaginatedList<T>({
    queryKey: scopedKey,
    fetchPage,
    pageSize,
    search,
    minSearchLength,
    staleTime,
    scrollThreshold,
    getItemKey: getOptionKey,
    // Nothing is fetched until the popover opens; reopening is instant from cache.
    enabled: open,
  });

  const selected: T[] = React.useMemo(
    () => (multiple ? ((value as T[] | null) ?? []) : value ? [value as T] : []),
    [multiple, value],
  );
  const selectedKeys = React.useMemo(
    () => new Set(selected.map(getOptionKey)),
    [selected, getOptionKey],
  );

  /**
   * Selected rows are merged into the rendered list from `value`, never taken from the
   * loaded pages. Without this a selection silently loses its tick — or vanishes from a
   * multi-select — as soon as a search excludes the page it arrived on. This is what v4's
   * `mergedOptions` was for.
   */
  const rendered = React.useMemo(() => {
    const loadedKeys = new Set(items.map(getOptionKey));
    const missingSelected = selected.filter((option) => !loadedKeys.has(getOptionKey(option)));
    return [...missingSelected, ...items];
  }, [items, selected, getOptionKey]);

  const visible = rendered.slice(0, maxRenderedOptions);
  const truncated = rendered.length - visible.length;

  const handleSelect = (option: T) => {
    if (getOptionDisabled?.(option)) return;
    if (multiple) {
      const key = getOptionKey(option);
      onChange(
        selectedKeys.has(key)
          ? selected.filter((o) => getOptionKey(o) !== key)
          : [...selected, option],
      );
    } else {
      onChange(option);
      setOpen(false);
    }
  };

  const triggerLabel = multiple
    ? placeholder
    : selected.length > 0
      ? displayValue(selected[0]!)
      : placeholder;

  // With `shouldFilter={false}` cmdk's <CommandEmpty> never renders — it keys off the
  // filtered count, which is always 0 when filtering is off. So the empty row is ours.
  const showEmpty = !isLoading && visible.length === 0;

  return (
    <div className={cn("space-y-2", className)}>
      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <Badge key={getOptionKey(option)} variant="secondary" className="gap-1 pr-1">
              {displayValue(option)}
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((o) => getOptionKey(o) !== getOptionKey(option)))
                }
                aria-label={`Remove ${displayValue(option)}`}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
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
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false} value={highlighted} onValueChange={setHighlighted}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            {addNew && (
              <button
                type="button"
                onClick={() => {
                  // Out of the way first: the add may open a drawer over this field.
                  setOpen(false);
                  addNew.onAdd(search);
                }}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-sm text-primary hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                {addNew.label}
              </button>
            )}
            {/* CommandList is already the scroll container (max-h-[300px] overflow-y-auto)
                and forwards props to the DOM node, so onScroll needs no ref plumbing. */}
            <CommandList onScroll={onScroll}>
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="sr-only">{t("a11y.loading")}</span>
                </div>
              )}
              {error && !isLoading && (
                <div className="px-3 py-4 text-sm text-destructive" role="alert">
                  {error.message}
                </div>
              )}
              {showEmpty && !error && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {minSearchLength > 0 && search.trim().length < minSearchLength
                    ? `Type at least ${minSearchLength} characters to search`
                    : emptyText}
                </div>
              )}
              {visible.length > 0 && (
                <CommandGroup>
                  {visible.map((option) => {
                    const key = getOptionKey(option);
                    const isDisabled = getOptionDisabled?.(option) ?? false;
                    return (
                      <CommandItem
                        key={key}
                        value={key}
                        disabled={isDisabled}
                        onSelect={() => handleSelect(option)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selectedKeys.has(key) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {renderOption ? renderOption(option) : displayValue(option)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {truncated > 0 && (
                <div className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
                  {truncated} more not shown - refine your search
                </div>
              )}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="sr-only">{t("a11y.loadingMore")}</span>
                </div>
              )}
              {!hasMore && !isLoading && visible.length > 0 && truncated === 0 && (
                <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                  End of results
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface ControlledAsyncComboboxProps<TFieldValues extends FieldValues, T> extends Omit<
  AsyncComboboxProps<T>,
  "value" | "onChange"
> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
}

/** Self-binding variant for `fieldKind: "custom"` fields in FormGenerator/DynamicFieldList. */
export function ControlledAsyncCombobox<TFieldValues extends FieldValues, T>({
  name,
  control,
  ...props
}: ControlledAsyncComboboxProps<TFieldValues, T>) {
  const { field } = useController({ name, control });
  return <AsyncCombobox {...props} value={field.value ?? null} onChange={field.onChange} />;
}
