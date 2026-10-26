import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** How far the pointer must travel before a press becomes a drag; below it, it is a click (sort). */
const DRAG_THRESHOLD_PX = 5;

interface DraggableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnId: string;
  /** Called once, on release, with the dragged column and the column it was dropped on. */
  onMoveColumn: (activeId: string, overId: string) => void;
}

/**
 * A header cell the user can drag sideways to reorder its column. Pinned, selection and expand
 * columns render a plain `TableHead` instead and stay where they are.
 *
 * Hand-rolled rather than dnd-kit, for two reasons that both matter on a table:
 * - **No re-render while dragging.** The cell is moved by writing its `transform` directly, and the
 *   drop target is marked with a data attribute, so a 100-row, 30-column table does no React work
 *   per pointer move. The order is committed once, on release.
 * - **No global live region.** dnd-kit mounts a `role="status"` node in the page for every
 *   `DndContext`, and the screens' own status messages (and their tests) look for exactly one.
 *
 * Hovering a header shows a tooltip ("drag and drop to rearrange") and an arrow rocking outward at each border, so the gesture is discoverable
 * without any training; the arrows are decorative and hidden while dragging.
 *
 * A press that never travels `DRAG_THRESHOLD_PX` is left alone, so the sort button inside still
 * works; after a real drag the click that follows the release is swallowed so it cannot also sort.
 */
export function DraggableHead({
  columnId,
  onMoveColumn,
  className,
  children,
  ...props
}: DraggableHeadProps) {
  const { t } = useTranslation();
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  // Ends a drag in progress if the header unmounts under it (navigation), so no listener leaks.
  const abort = React.useRef<(() => void) | null>(null);
  React.useEffect(() => () => abort.current?.(), []);

  const onPointerDown = (event: React.PointerEvent<HTMLTableCellElement>) => {
    const target = event.target;
    if (event.button !== 0 || !(target instanceof Element)) return;
    // A finger on a header is a scroll, not a drag; touch users reorder from the Columns menu.
    if (event.pointerType === "touch") return;
    // The resize handle has its own gesture.
    if (target.closest("[role=separator]")) return;
    const cell = cellRef.current;
    const row = cell?.parentElement;
    if (!cell || !row) return;

    const startX = event.clientX;
    let dragging = false;
    let overId: string | null = null;

    const clearMarks = () =>
      row.querySelectorAll<HTMLElement>("[data-drop]").forEach((el) => delete el.dataset.drop);

    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        cell.dataset.dragging = "true";
      }
      cell.style.transform = `translate3d(${dx}px, 0, 0)`;
      clearMarks();
      overId = null;
      for (const other of row.querySelectorAll<HTMLElement>("[data-column-id]")) {
        if (other === cell) continue;
        const rect = other.getBoundingClientRect();
        if (move.clientX >= rect.left && move.clientX < rect.right) {
          overId = other.dataset.columnId ?? null;
          // The line sits on the side the column will land on: dragging toward an EARLIER column
          // (the dragged cell follows `other` in the row) it lands before it, otherwise after.
          other.dataset.drop =
            other.compareDocumentPosition(cell) & Node.DOCUMENT_POSITION_FOLLOWING
              ? "left"
              : "right";
          break;
        }
      }
    };

    const finish = (up: PointerEvent) => {
      abort.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      clearMarks();
      cell.style.transform = "";
      delete cell.dataset.dragging;
      if (!dragging) return;
      // The release is followed by a click on whatever is under the pointer; it must not sort.
      const swallow = (click: Event) => click.stopPropagation();
      cell.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => cell.removeEventListener("click", swallow, { capture: true }), 0);
      if (up.type === "pointerup" && overId && overId !== columnId) onMoveColumn(columnId, overId);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    abort.current = () => finish(new PointerEvent("pointercancel"));
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead
          ref={cellRef}
          {...props}
          data-column-id={columnId}
          onPointerDown={onPointerDown}
          className={cn(
            "group/head relative cursor-grab select-none transition-colors hover:bg-muted/60",
            "data-[dragging=true]:z-20 data-[dragging=true]:cursor-grabbing data-[dragging=true]:bg-muted data-[dragging=true]:opacity-90 data-[dragging=true]:shadow-md",
            "data-[drop=left]:shadow-[inset_2px_0_0_hsl(var(--primary))] data-[drop=right]:shadow-[inset_-2px_0_0_hsl(var(--primary))]",
            className,
          )}
        >
          {children}
          <EdgeCue side="left" />
          <EdgeCue side="right" />
        </TableHead>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("table.dragToReorder")}</TooltipContent>
    </Tooltip>
  );
}

/** The hover cue on one border of a header: an arrow straddling the border, rocking outward. */
function EdgeCue({ side }: { side: "left" | "right" }) {
  const Arrow = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <Arrow
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 z-[3] my-auto size-4 rounded-full bg-primary p-0.5 text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover/head:opacity-100 group-data-[dragging=true]/head:opacity-0 motion-reduce:animate-none",
        side === "left"
          ? "-left-2 group-hover/head:animate-nudge-left"
          : "-right-2 group-hover/head:animate-nudge-right",
      )}
    />
  );
}
