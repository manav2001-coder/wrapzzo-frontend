import * as React from "react";
import type { PermissionKey } from "@/lib/permissions";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PermissionButton } from "@/components/access-control/permission-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One row on either side. `inherited` rows are read-only — see the note on the panel. */
export interface TransferItem {
  id: string;
  /** Primary line — a feature key, a template name. */
  label: string;
  /** Secondary line — "User Master · View". */
  hint?: string;
}

export interface TransferListProps {
  available: TransferItem[];
  /** Assigned ON this record — selectable and removable. */
  direct: TransferItem[];
  /**
   * Reachable only THROUGH something else (an included template). Shown so the picture is
   * complete, but never selectable: removing it here would be a lie, because the grant does
   * not live on this record. v4 renders these disabled and italic for the same reason.
   */
  inherited?: TransferItem[];
  onAdd: (ids: string[]) => void | Promise<void>;
  onRemove: (ids: string[]) => void | Promise<void>;
  /** Gates both buttons. Selection stays usable so the lists can still be read. */
  permission?: PermissionKey;
  availableSearch: string;
  onAvailableSearchChange: (value: string) => void;
  /** Total matching on the server, when the available side is paged. */
  availableTotal?: number | null;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  /** Paging trigger for the available side — from `usePaginatedList`. */
  onAvailableScroll?: React.UIEventHandler<HTMLElement>;
  sentinelRef?: (node: HTMLElement | null) => void;
  labels?: { available?: string; assigned?: string };
  busy?: boolean;
}

/** Tri-state select-all. Indeterminate when some but not all of `items` are selected. */
function SelectAll({
  items,
  selected,
  onChange,
}: {
  items: TransferItem[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  // Its own hook: this is a sibling function, not a child of the component that already
  // holds `t`, and both panels render one.
  const { t } = useTranslation(["tbac", "common"]);
  const selectable = items.length > 0;
  const all = selectable && items.every((item) => selected.has(item.id));
  const some = items.some((item) => selected.has(item.id));

  return (
    <Checkbox
      aria-label={t("action.selectAll", { ns: "common" })}
      disabled={!selectable}
      checked={all ? true : some ? "indeterminate" : false}
      onCheckedChange={(checked) => onChange(checked ? new Set(items.map((i) => i.id)) : new Set())}
    />
  );
}

function Row({
  item,
  selected,
  onToggle,
  readOnly,
  badge,
}: {
  item: TransferItem;
  selected?: boolean;
  onToggle?: () => void;
  readOnly?: boolean;
  badge?: string;
}) {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs">{item.label}</span>
        {item.hint && (
          <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
        )}
      </span>
      {badge && (
        <Badge variant="secondary" className="shrink-0">
          {badge}
        </Badge>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 opacity-60">
        {/* Spacer keeps the text aligned with the selectable rows above it. */}
        <span className="w-4 shrink-0" aria-hidden />
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60",
        selected && "bg-muted",
      )}
    >
      <Checkbox checked={selected} tabIndex={-1} className="pointer-events-none shrink-0" />
      {content}
    </button>
  );
}

/**
 * The two-panel picker behind Features-to-Template and Bulk Assign — v4's dual-list
 * transfer UI, rebuilt on shadcn.
 *
 * The asymmetry between the panels is the whole design: the left is a paged, server-searched
 * list of everything on offer; the right is what this record actually holds, split into what
 * it owns (`direct`) and what it merely sees through a reference (`inherited`). Only `direct`
 * is selectable, so "Remove" can never be offered for something this record cannot remove.
 */
export function TransferList({
  available,
  direct,
  inherited = [],
  onAdd,
  onRemove,
  permission,
  availableSearch,
  onAvailableSearchChange,
  availableTotal,
  isLoading = false,
  isLoadingMore = false,
  onAvailableScroll,
  sentinelRef,
  labels,
  busy = false,
}: TransferListProps) {
  const { t } = useTranslation("tbac");
  const [selectedAvailable, setSelectedAvailable] = React.useState<Set<string>>(new Set());
  const [selectedAssigned, setSelectedAssigned] = React.useState<Set<string>>(new Set());
  const [assignedSearch, setAssignedSearch] = React.useState("");

  /**
   * Selections are pruned on READ, not in an effect.
   *
   * After an add the id moves to the other side, and a stale id left in the set would
   * silently re-submit on the next click. Deriving it means there is no render in which
   * the two are out of step — an effect prunes only AFTER the list has already painted
   * with the dead selection, and its `setState` costs a second pass every time.
   */
  const liveSelectedAvailable = React.useMemo(() => {
    const live = new Set(available.map((i) => i.id));
    return new Set([...selectedAvailable].filter((id) => live.has(id)));
  }, [available, selectedAvailable]);

  const liveSelectedAssigned = React.useMemo(() => {
    const live = new Set(direct.map((i) => i.id));
    return new Set([...selectedAssigned].filter((id) => live.has(id)));
  }, [direct, selectedAssigned]);

  const needle = assignedSearch.trim().toLowerCase();
  // `useCallback` so the two memos below can list what they actually use. The deps were
  // right either way — `matches` only closes over `needle` — but spelling that out beats
  // a reader having to prove it, and it is what lets the memo dependency be honest.
  const matches = React.useCallback(
    (item: TransferItem) =>
      !needle ||
      item.label.toLowerCase().includes(needle) ||
      (item.hint?.toLowerCase().includes(needle) ?? false),
    [needle],
  );

  const filteredDirect = React.useMemo(() => direct.filter(matches), [direct, matches]);
  const filteredInherited = React.useMemo(() => inherited.filter(matches), [inherited, matches]);

  function toggle(set: Set<string>, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
      {/* Test ids on the two columns: the SAME feature key can legitimately appear on both
          sides (per-tenant feature rows, plus a key that is both available and assigned), so
          a page-wide text query is ambiguous. Matches the `data-testid` convention Field
          Configuration already uses. */}
      <Card data-testid="transfer-available">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SelectAll
                items={available}
                selected={liveSelectedAvailable}
                onChange={setSelectedAvailable}
              />
              <h3 className="text-sm font-semibold">
                {labels?.available ?? t("transfer.available")}
              </h3>
            </div>
            <Badge variant="secondary">{availableTotal ?? available.length}</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={availableSearch}
              onChange={(event) => onAvailableSearchChange(event.target.value)}
              placeholder={t("transfer.searchAvailable")}
              className="pl-8"
            />
          </div>

          <div
            onScroll={onAvailableScroll}
            className="h-[26rem] divide-y overflow-y-auto rounded-md border"
          >
            {isLoading && (
              <div className="space-y-2 p-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            {!isLoading &&
              available.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  selected={liveSelectedAvailable.has(item.id)}
                  onToggle={() => setSelectedAvailable((prev) => toggle(prev, item.id))}
                />
              ))}
            {!isLoading && available.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t("transfer.noneAvailable")}
              </p>
            )}
            {isLoadingMore && <Skeleton className="m-3 h-8" />}
            <div ref={sentinelRef} className="h-px" aria-hidden />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-row items-center justify-center gap-2 lg:flex-col">
        <PermissionButton
          permission={permission}
          onClick={() => void onAdd([...liveSelectedAvailable])}
          disabled={liveSelectedAvailable.size === 0 || busy}
        >
          <ArrowRight className="mr-2 h-4 w-4 lg:mr-0" />
          <span className="lg:sr-only">{t("transfer.add")}</span>
        </PermissionButton>
        <PermissionButton
          permission={permission}
          variant="outline"
          onClick={() => void onRemove([...liveSelectedAssigned])}
          disabled={liveSelectedAssigned.size === 0 || busy}
        >
          <ArrowLeft className="mr-2 h-4 w-4 lg:mr-0" />
          <span className="lg:sr-only">{t("transfer.remove")}</span>
        </PermissionButton>
      </div>

      <Card data-testid="transfer-assigned">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Direct only: `inherited` cannot be removed from here, so offering to
                  select it would offer an action that does not exist. */}
              <SelectAll
                items={filteredDirect}
                selected={liveSelectedAssigned}
                onChange={setSelectedAssigned}
              />
              <h3 className="text-sm font-semibold">
                {labels?.assigned ?? t("transfer.assigned")}
              </h3>
            </div>
            <Badge variant="secondary">{filteredDirect.length + filteredInherited.length}</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={assignedSearch}
              onChange={(event) => setAssignedSearch(event.target.value)}
              placeholder={t("transfer.searchAssigned")}
              className="pl-8"
            />
          </div>

          <div className="h-[26rem] overflow-y-auto rounded-md border">
            <p className="border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {t("transfer.direct", { count: filteredDirect.length })}
            </p>
            <div className="divide-y">
              {filteredDirect.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  selected={liveSelectedAssigned.has(item.id)}
                  onToggle={() => setSelectedAssigned((prev) => toggle(prev, item.id))}
                />
              ))}
            </div>

            {filteredInherited.length > 0 && (
              <>
                <p
                  className="border-y bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  title={t("transfer.inheritedHint")}
                >
                  {t("transfer.inherited", { count: filteredInherited.length })}
                </p>
                <div className="divide-y">
                  {filteredInherited.map((item) => (
                    <Row key={item.id} item={item} readOnly badge={t("transfer.inheritedBadge")} />
                  ))}
                </div>
              </>
            )}

            {filteredDirect.length === 0 && filteredInherited.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t("transfer.noneAssigned")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
