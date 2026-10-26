import * as React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import {
  MAX_COLUMN_SIZE,
  MIN_COLUMN_SIZE,
  clampColumnSize,
} from "@/components/data-table/column-sizing";

interface ColumnResizerProps {
  /** The column's current width in px. */
  width: number;
  /** Called once per gesture with the final width, never per pointer move. */
  onResize: (width: number) => void;
  /** Double-click: back to the column's default width. */
  onReset: () => void;
  /** Accessible name — the column's title. */
  label: string;
  /**
   * Which edge of the header carries the handle. A column pinned to the right edge grows LEFTWARD
   * (its right side is fixed to the frame), so its handle sits on the left and dragging left widens.
   */
  side?: "left" | "right";
}

const KEY_STEP = 10;
const KEY_STEP_LARGE = 40;
/** How long a held or repeated arrow key may pause before its width is committed. */
const KEY_COMMIT_MS = 150;

/**
 * The drag handle on a header cell's right edge.
 *
 * While dragging, the column follows the pointer live through widths written straight onto the
 * header cell and the table (see `preview`), so no row re-renders per pointer move; the width is
 * committed once, on release. That is what keeps resizing smooth on a 100-row, 30-column table.
 * Keyboard users get the same thing with the arrow keys on the focused handle: each press moves
 * the preview, and a burst of presses (a held key repeats ~30 times a second) is committed once,
 * when it pauses or the handle loses focus.
 */
export function ColumnResizer({
  width,
  onResize,
  onReset,
  label,
  side = "right",
}: ColumnResizerProps) {
  const { t } = useTranslation();
  const drag = React.useRef<{
    startX: number;
    startWidth: number;
    cell: HTMLElement | null;
    table: HTMLElement | null;
    startTableWidth: number;
  } | null>(null);
  // +1 when moving right widens the column, -1 when it narrows it (a left-edge handle).
  const direction = side === "left" ? -1 : 1;
  const [dragging, setDragging] = React.useState(false);

  const deltaFor = (clientX: number) => {
    const start = drag.current;
    if (!start) return 0;
    // Clamp the preview too, so it stops where the column would.
    return (
      clampColumnSize(start.startWidth + direction * (clientX - start.startX)) - start.startWidth
    );
  };

  /**
   * Live preview: write the new width straight onto the header cell and the table. With
   * `table-layout: fixed` every cell of the column follows, so the column resizes under the pointer
   * while React does no work at all; the commit on release just makes the same numbers official.
   */
  const preview = (delta: number) => {
    const start = drag.current;
    if (!start) return;
    if (start.cell) start.cell.style.width = `${start.startWidth + delta}px`;
    if (start.table) start.table.style.width = `${start.startTableWidth + delta}px`;
  };

  /** Ends the gesture: the inline preview widths go back before React re-renders, so a rejected or
   * unchanged width leaves no preview behind (a committed one is re-applied by the render). */
  const end = () => {
    preview(0);
    drag.current = null;
    setDragging(false);
  };

  // Arrow-key resizing: the width a burst of presses has reached, previewed on the header cell
  // and committed once the burst pauses.
  const keys = React.useRef<{
    next: number;
    startWidth: number;
    cell: HTMLElement | null;
    table: HTMLElement | null;
    startTableWidth: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const commitKeys = () => {
    const burst = keys.current;
    if (!burst) return;
    clearTimeout(burst.timer);
    keys.current = null;
    if (burst.cell) burst.cell.style.width = `${burst.startWidth}px`;
    if (burst.table) burst.table.style.width = `${burst.startTableWidth}px`;
    if (burst.next !== burst.startWidth) onResize(burst.next);
  };
  // A pending commit must not fire at a handle that is gone.
  React.useEffect(() => () => clearTimeout(keys.current?.timer), []);
  const nudge = (event: React.KeyboardEvent<HTMLDivElement>, delta: number) => {
    const burst = keys.current;
    const base = burst?.next ?? width;
    const next = clampColumnSize(base + delta);
    const cell = burst?.cell ?? event.currentTarget.closest<HTMLElement>("th");
    const table = burst?.table ?? event.currentTarget.closest<HTMLElement>("table");
    const startWidth = burst?.startWidth ?? width;
    const startTableWidth = burst?.startTableWidth ?? table?.getBoundingClientRect().width ?? 0;
    if (burst) clearTimeout(burst.timer);
    if (cell) cell.style.width = `${next}px`;
    if (table) table.style.width = `${startTableWidth + next - startWidth}px`;
    keys.current = {
      next,
      startWidth,
      cell,
      table,
      startTableWidth,
      timer: setTimeout(commitKeys, KEY_COMMIT_MS),
    };
  };

  const finish = (clientX: number) => {
    const start = drag.current;
    if (!start) return;
    // Read the delta BEFORE ending the gesture: `deltaFor` has nothing to measure from after.
    const next = start.startWidth + deltaFor(clientX);
    end();
    if (next !== start.startWidth) onResize(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      // `aria-valuetext`, not `aria-label`: the handle lives inside the header cell, so a label
      // would become part of the HEADER's accessible name ("Resize column Name" for "Name").
      aria-valuetext={t("table.resizeColumn", { column: label })}
      aria-valuenow={Math.round(width)}
      aria-valuemin={MIN_COLUMN_SIZE}
      aria-valuemax={MAX_COLUMN_SIZE}
      tabIndex={0}
      className={cn(
        "group/resize absolute top-0 z-[2] h-full w-1.5 cursor-col-resize touch-none select-none",
        side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
        "after:absolute after:inset-y-1 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border after:transition-colors",
        "hover:after:w-0.5 hover:after:bg-primary focus-visible:outline-none focus-visible:after:w-0.5 focus-visible:after:bg-primary",
        "hover:bg-primary/15 focus-visible:bg-primary/15",
        dragging && "bg-primary/15 after:w-0.5 after:bg-primary",
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onReset();
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const cell = event.currentTarget.closest<HTMLElement>("th");
        const table = event.currentTarget.closest<HTMLElement>("table");
        drag.current = {
          startX: event.clientX,
          startWidth: width,
          cell,
          table,
          startTableWidth: table?.getBoundingClientRect().width ?? 0,
        };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (drag.current) preview(deltaFor(event.clientX));
      }}
      onPointerUp={(event) => finish(event.clientX)}
      onPointerCancel={end}
      onKeyDown={(event) => {
        const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
        if (event.key === "ArrowRight") nudge(event, direction * step);
        else if (event.key === "ArrowLeft") nudge(event, -direction * step);
        else if (event.key === "Enter" || event.key === "Home") {
          commitKeys();
          onReset();
        } else return;
        event.preventDefault();
      }}
      onBlur={commitKeys}
    />
  );
}
