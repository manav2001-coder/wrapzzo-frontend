import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import type { ListFieldMap } from "@/lib/list-fields";

import { renderWithProviders } from "@/test/test-utils";
import { DataTable } from "./data-table";

interface Row {
  id: string;
  driverName: string;
}

/**
 * A column keyed by one id (`driverId`, what Field Config and TanStack know it as) that
 * DISPLAYS a name and filters on another field (`driverName`). The filter payload must name
 * the `meta.filterField`, not the column id.
 *
 * It used to name the column id: the payload builder looked the column up by comparing
 * `fieldNameOf(column)` — which already resolves to `meta.filterField` — against TanStack's
 * filter id, which is the COLUMN id. The two differ exactly when `filterField` is set, so the
 * lookup missed, `filterField` was never applied, and typing "amit" into a Driver box sent
 * `driverId ILIKE '%amit%'` and answered 500 (`operator does not exist: uuid ~~* unknown`).
 */
const listFields: ListFieldMap = { driverName: "text", driverId: "id" };

const columns: ColumnDef<Row, unknown>[] = [
  {
    id: "driverId",
    accessorKey: "driverName",
    header: "Driver",
    meta: { filterField: "driverName", filterVariant: "text" },
  },
];

describe("DataTable - a column whose filterField differs from its id", () => {
  it("sends the filterField, not the column id, in the filter payload", async () => {
    const user = userEvent.setup();
    const fetchData = vi
      .fn()
      .mockResolvedValue({ rows: [{ id: "1", driverName: "Amit" }], pageCount: 1, totalCount: 1 });
    renderWithProviders(
      <DataTable<Row>
        columns={columns}
        fetchData={fetchData}
        tableId="filter-field"
        listFields={listFields}
      />,
    );

    await user.type(await screen.findByPlaceholderText(/search driver/i), "amit");

    await waitFor(() => {
      const last = fetchData.mock.calls.at(-1)![0] as { filters: { field: string }[] };
      expect(last.filters.map((f) => f.field)).toEqual(["driverName"]);
    });
  });
});
