import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";

import { renderWithProviders } from "@/test/test-utils";
import { DataTable } from "@/components/data-table";

interface Row {
  id: string;
  name: string;
}

const columns: ColumnDef<Row, unknown>[] = [
  { id: "id", accessorKey: "id", header: "ID" },
  { id: "name", accessorKey: "name", header: "Name" },
];

const data: Row[] = [{ id: "1", name: "Ada" }];

const openPopover = async () => {
  await userEvent.click(screen.getByRole("button", { name: /configure columns/i }));
};

/**
 * Driven through `DataTable`, not the popover alone — which is the whole point.
 *
 * The previous test rendered `ColumnVisibilityPopover` against a bare react-table instance and
 * asserted that localStorage held `"name":false` and that the CHECKBOX was still unchecked
 * after a remount. Both were true, and the feature was still broken: the popover owned its own
 * `useTableColumnConfig` while the table's `useReactTable` had no `columnVisibility` in its
 * state, so nothing ever re-hid the column. Reload, and the column was back with its box
 * unchecked. A test can only catch that by asserting on the TABLE.
 */
describe("column visibility", () => {
  beforeEach(() => localStorage.clear());

  it("hiding a column removes its header from the table", async () => {
    renderWithProviders(
      <DataTable<Row> columns={columns} data={data} configNamespace="vehicles" />,
    );
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();

    await openPopover();
    await userEvent.click(screen.getByRole("checkbox", { name: "Name" }));

    expect(screen.queryByRole("columnheader", { name: /name/i })).not.toBeInTheDocument();
    expect(localStorage.getItem("wrapzzo.table-column-config.vehicles")).toContain('"name":false');
  });

  it("the column STAYS hidden across a remount, not just its checkbox", async () => {
    const { unmount } = renderWithProviders(
      <DataTable<Row> columns={columns} data={data} configNamespace="vehicles" />,
    );
    await openPopover();
    await userEvent.click(screen.getByRole("checkbox", { name: "Name" }));
    unmount();

    renderWithProviders(
      <DataTable<Row> columns={columns} data={data} configNamespace="vehicles" />,
    );

    // The assertion the old test was missing.
    expect(screen.queryByRole("columnheader", { name: /name/i })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /id/i })).toBeInTheDocument();

    await openPopover();
    expect(screen.getByRole("checkbox", { name: "Name" })).not.toBeChecked();
  });

  it("showing it again brings the column back", async () => {
    renderWithProviders(
      <DataTable<Row> columns={columns} data={data} configNamespace="vehicles" />,
    );
    await openPopover();
    await userEvent.click(screen.getByRole("checkbox", { name: "Name" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Name" }));

    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
  });

  it("renders no popover at all without a configNamespace", () => {
    renderWithProviders(<DataTable<Row> columns={columns} data={data} />);
    expect(screen.queryByRole("button", { name: /configure columns/i })).not.toBeInTheDocument();
  });
});
