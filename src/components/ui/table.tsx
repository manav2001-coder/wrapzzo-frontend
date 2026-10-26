import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * `containerClassName` styles the scrolling wrapper. A table that fills a bounded frame (the
 * DataTable) gives it `min-h-0 flex-1`, so this one wrapper is the only scroller rather than a
 * second one nested inside another.
 *
 * Cells are one truncated line by default (see `TableCell`). Two exceptions are made here, for the
 * whole table, rather than left to every screen:
 * - A cell that SPANS columns holds free-form content (a group header, an expanded panel, an empty
 *   or error message), not one value, so it wraps and never clips — `overflow-hidden` would cut the
 *   panel and stop a sticky message following the horizontal scroll.
 * - `wrapCells` opts the whole table back into wrapping, for a detail table whose cells are
 *   deliberately several lines tall (a description over its reference, a list of reasons).
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string; wrapCells?: boolean }
>(({ className, containerClassName, wrapCells, ...props }, ref) => (
  <div className={cn("relative w-full overflow-auto", containerClassName)}>
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm [&_td[colspan]]:overflow-visible [&_td[colspan]]:whitespace-normal",
        wrapCells && "[&_td]:overflow-visible [&_td]:whitespace-normal [&_td]:text-left",
        className,
      )}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      // Strong and full-contrast, like a form `Label` (`font-semibold`), so a title reads as a title.
      "h-10 whitespace-nowrap px-2 text-center align-middle font-semibold text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      // Centred under the centred titles; a cell that spans columns holds a panel or a message and
      // reads from the left.
      props.colSpan && props.colSpan > 1 ? "text-left" : "text-center",
      // One line per cell keeps every row the same height; the table scrolls sideways instead.
      // A column that must wrap sets `meta.wrap` (DataTable adds `whitespace-normal`).
      "overflow-hidden text-ellipsis whitespace-nowrap p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
