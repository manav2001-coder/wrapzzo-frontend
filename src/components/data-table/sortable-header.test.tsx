import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { renderWithProviders } from "@/test/test-utils";
import { SortableHeader } from "./sortable-header";

function Harness() {
  const table = useReactTable({
    data: [{ vehicle: "Bus" }],
    columns: [{ accessorKey: "vehicle" }],
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: true,
  });
  const column = table.getColumn("vehicle")!;
  return (
    <>
      <SortableHeader column={column}>Vehicle registration number</SortableHeader>
      <output data-testid="sort">{String(column.getIsSorted())}</output>
    </>
  );
}

describe("SortableHeader", () => {
  it("preserves the full label and cycles ascending, descending, then unsorted", () => {
    renderWithProviders(<Harness />);
    const button = screen.getByRole("button", { name: "Vehicle registration number" });
    expect(screen.getByText("Vehicle registration number")).not.toHaveClass("truncate");
    expect(button.querySelector("svg")).toHaveClass("shrink-0");
    for (const direction of ["asc", "desc", "false"]) {
      fireEvent.click(button);
      expect(screen.getByTestId("sort")).toHaveTextContent(direction);
    }
  });
});
