import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";

import { renderWithProviders } from "@/test/test-utils";
import { DataTable } from "./data-table";

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

const data: Row[] = [{ id: "1", name: "Ada Lovelace", status: "active" }];

const KEY = "wrapzzo.table-column-config.layout-test";

const headerNames = () =>
  within(screen.getAllByRole("row")[0]!)
    .getAllByRole("columnheader")
    .map((cell) => cell.textContent?.trim() ?? "");

describe("DataTable - per-user column layout", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the table's own order until the user has reordered", () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    expect(headerNames()).toEqual(["ID", "Name", "Status"]);
  });

  it("opens in the user's saved order", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ visibility: {}, order: ["status", "id", "name"], sizing: {} }),
    );
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    expect(headerNames()).toEqual(["Status", "ID", "Name"]);
  });

  it("appends a column the saved order never saw and ignores one that is gone", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ visibility: {}, order: ["name", "removed", "id"], sizing: {} }),
    );
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    expect(headerNames()).toEqual(["Name", "ID", "Status"]);
  });

  it("opens a column at its saved width", () => {
    localStorage.setItem(KEY, JSON.stringify({ visibility: {}, order: [], sizing: { name: 333 } }));
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveStyle({ width: "333px" });
  });

  it("keeps the selection column first whatever the saved order says", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ visibility: {}, order: ["status", "name", "id"], sizing: {} }),
    );
    renderWithProviders(<DataTable columns={columns} data={data} configNamespace="layout-test" />);
    const heads = within(screen.getAllByRole("row")[0]!).getAllByRole("columnheader");
    expect(within(heads[0]!).getByRole("checkbox")).toBeInTheDocument();
    expect(heads.slice(1).map((cell) => cell.textContent?.trim())).toEqual([
      "Status",
      "Name",
      "ID",
    ]);
  });

  it("keeps every cell on one line, except a column that asks to wrap", () => {
    const wrapping: ColumnDef<Row, unknown>[] = [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "name", header: "Name", meta: { wrap: true } },
    ];
    renderWithProviders(
      <DataTable columns={wrapping} data={data} showRowSelectionColumn={false} />,
    );
    expect(screen.getByRole("cell", { name: "1" })).toHaveClass(
      "whitespace-nowrap",
      "text-ellipsis",
    );
    expect(screen.getByRole("cell", { name: "Ada Lovelace" })).toHaveClass("whitespace-normal");
    expect(screen.getByRole("cell", { name: "Ada Lovelace" })).not.toHaveClass("whitespace-nowrap");
  });

  it("resizes a column from the keyboard, remembers it, and resets it on double-click", async () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    const nameHead = () => screen.getByRole("columnheader", { name: "Name" });
    const handle = within(nameHead()).getByRole("separator");
    expect(nameHead()).toHaveStyle({ width: "200px" });

    // The column follows the key at once; the layout is saved when the presses pause.
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(nameHead()).toHaveStyle({ width: "210px" });
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(KEY)!).sizing).toEqual({ name: 210 }),
    );
    expect(nameHead()).toHaveStyle({ width: "210px" });

    fireEvent.doubleClick(within(nameHead()).getByRole("separator"));
    expect(nameHead()).toHaveStyle({ width: "200px" });
    expect(JSON.parse(localStorage.getItem(KEY)!).sizing).toEqual({});
  });

  it("reorders from the Columns menu, saves it, and resets to the franchise order", async () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Configure columns" }));

    // The first column cannot move earlier, the last cannot move later.
    expect(screen.getByRole("button", { name: "Move ID earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Status later" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Move Name earlier" }));
    expect(headerNames()).toEqual(["Name", "ID", "Status"]);
    expect(JSON.parse(localStorage.getItem(KEY)!).order).toEqual(["name", "id", "status"]);

    await userEvent.click(screen.getByRole("button", { name: "Reset columns to default" }));
    expect(headerNames()).toEqual(["ID", "Name", "Status"]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("steps over a hidden column rather than onto it", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ visibility: { name: false }, order: [], sizing: {} }),
    );
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        configNamespace="layout-test"
        showRowSelectionColumn={false}
      />,
    );
    expect(headerNames()).toEqual(["ID", "Status"]);
    await userEvent.click(screen.getByRole("button", { name: "Configure columns" }));
    await userEvent.click(screen.getByRole("button", { name: "Move Status earlier" }));
    expect(headerNames()).toEqual(["Status", "ID"]);
  });
});

describe("DataTable - column alignment", () => {
  it("centres every title and, by default, every cell, unless a column sets its own alignment", () => {
    renderWithProviders(
      <DataTable
        columns={[
          { accessorKey: "id", header: "ID", meta: { align: "right" } },
          { accessorKey: "name", header: "Name" },
          { id: "actions", header: "Actions", cell: () => "go", meta: { pin: "right" } },
        ]}
        data={data}
        showRowSelectionColumn={false}
      />,
    );
    const header = (name: string) => screen.getByRole("columnheader", { name });
    // Titles are always centred; only the cells follow the column's alignment.
    for (const name of ["ID", "Name", "Actions"]) {
      expect(header(name)).toHaveClass("text-center");
      expect(header(name)).not.toHaveClass("text-left", "text-right");
    }
    const cells = within(screen.getAllByRole("row")[1]!).getAllByRole("cell");
    expect(cells.map((cell) => cell.className.match(/text-(left|center|right)/)?.[0])).toEqual([
      "text-right",
      "text-center",
      "text-center",
    ]);
  });
});
