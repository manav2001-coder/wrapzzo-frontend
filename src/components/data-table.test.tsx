import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";

import { ApiError } from "@/lib/axiosClient";
import { deferred, renderWithProviders } from "@/test/test-utils";
import { DataTable } from "./data-table";
import type { TableAction } from "./data-table/types";

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
];

const data: Row[] = [
  { id: "1", name: "Ada Lovelace", status: "active" },
  { id: "2", name: "Grace Hopper", status: "inactive" },
];

describe("DataTable - client mode (existing behavior)", () => {
  it("renders header cells and row data", () => {
    renderWithProviders(<DataTable columns={columns} data={data} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("fills a bounded frame: the table is the one row that gives way, its header stays put and pagination is outside the scroller", () => {
    const { container } = renderWithProviders(<DataTable columns={columns} data={data} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("frame-fill", "grid", "grow", "shrink", "min-h-0");
    expect(root.className).toContain("minmax(12rem,1fr)");
    const scroller = container.querySelector("table")!.parentElement!;
    expect(scroller).toHaveClass("overflow-auto", "min-h-0", "flex-1");
    expect(container.querySelector("thead")).toHaveClass("sticky", "top-0");
    const pagination = screen.getByText("Rows per page").closest(".row-start-4");
    expect(pagination).not.toBeNull();
    expect(scroller.parentElement).not.toContainElement(pagination as HTMLElement);
  });

  it("carries a column's meta.className onto its header cell", () => {
    /*
     * A `min-w-[…]` floor is the only thing that stops `table-layout: auto` squeezing a
     * header/filter box to nothing the moment the sidebar expands and the table's own
     * container shrinks — jsdom performs no layout, so this can only pin the CLASS, not
     * the resulting width. See the Franchise Master headers this guards.
     */
    const withFloor: ColumnDef<Row, unknown>[] = [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "name", header: "Name", meta: { className: "min-w-[200px]" } },
    ];
    renderWithProviders(<DataTable columns={withFloor} data={data} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveClass("min-w-[200px]");
  });

  it("shows the empty message when there is no data", () => {
    renderWithProviders(<DataTable columns={columns} data={[]} emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("shows skeleton rows while loading instead of the empty message", () => {
    renderWithProviders(
      <DataTable columns={columns} data={[]} isLoading emptyMessage="Nothing here." />,
    );
    expect(screen.queryByText("Nothing here.")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("paginates when pageSize is smaller than the data length", () => {
    const bigData: Row[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
      status: "active",
    }));
    renderWithProviders(<DataTable columns={columns} data={bigData} pageSize={2} />);

    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.queryByText("Row 2")).not.toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it("shows the current pageSize as the selected 'Rows per page' value even when it isn't one of the standard options", () => {
    renderWithProviders(<DataTable columns={columns} data={data} pageSize={3} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("3");
  });

  // Put-Away's pending/completed status picker is the first consumer — a bespoke filter with
  // no column or LIST_FIELDS entry to hang off, so it has nowhere else to render but here.
  it("renders toolbarFilter in the toolbar, beside the search box", () => {
    renderWithProviders(
      <DataTable columns={columns} data={data} toolbarFilter={<button>Status filter</button>} />,
    );
    expect(screen.getByRole("button", { name: "Status filter" })).toBeInTheDocument();
  });
});

describe("DataTable - row selection", () => {
  it("shows the 'N selected' bar after selecting a row", async () => {
    renderWithProviders(<DataTable columns={columns} data={data} />);

    await userEvent.click(screen.getByRole("checkbox", { name: /select row 1/i }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("prevents selecting a row disallowed by getRowCanSelect", () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        getRowCanSelect={(row) => row.status === "active"}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /select row 1/i })).not.toBeDisabled();
  });

  it("Clear resets the selection", async () => {
    renderWithProviders(<DataTable columns={columns} data={data} />);

    await userEvent.click(screen.getByRole("checkbox", { name: /select row 1/i }));
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  /**
   * `renderBulkActions`'s second argument — added for a bulk action that needs the actual
   * row data (e.g. printing a QR sticker per selected vehicle), not just a server-side
   * export. Every existing caller reads only the first argument, so this must be additive.
   */
  it("passes the selected rows as renderBulkActions' second argument", async () => {
    const renderBulkActions = vi.fn(() => null);
    renderWithProviders(
      <DataTable columns={columns} data={data} renderBulkActions={renderBulkActions} />,
    );

    expect(renderBulkActions).toHaveBeenLastCalledWith(expect.anything(), []);

    await userEvent.click(screen.getByRole("checkbox", { name: /select row 1/i }));
    expect(renderBulkActions).toHaveBeenLastCalledWith(expect.anything(), [data[0]]);
  });
});

describe("DataTable - server mode", () => {
  /*
   * UAT: a vehicle resolved out of Breakdown still read "Breakdown" on Transport Assets — the
   * list came from a cache the app's 10s default treated as fresh. A list re-reads on mount.
   */
  it("re-reads its rows when it mounts again, even inside the app's stale window", async () => {
    const fetchData = vi.fn().mockResolvedValue({ rows: data, pageCount: 1, totalCount: 2 });
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } });
    function Toggle() {
      const [shown, setShown] = React.useState(true);
      return (
        <QueryClientProvider client={client}>
          <button type="button" onClick={() => setShown((v) => !v)}>
            toggle
          </button>
          {shown ? <DataTable columns={columns} fetchData={fetchData} tableId="rows" /> : null}
        </QueryClientProvider>
      );
    }
    renderWithProviders(<Toggle />);
    await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "toggle" }));
    await user.click(screen.getByRole("button", { name: "toggle" }));

    await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(2));
  });

  it("calls fetchData with pageIndex/pageSize/filters and renders returned rows", async () => {
    const fetchData = vi.fn().mockResolvedValue({ rows: data, pageCount: 1, totalCount: 2 });
    renderWithProviders(<DataTable columns={columns} fetchData={fetchData} tableId="rows" />);

    await waitFor(() =>
      expect(fetchData).toHaveBeenCalledWith(
        expect.objectContaining({ pageIndex: 0, pageSize: 10, filters: [] }),
      ),
    );
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
  });

  /**
   * A failed fetch must not look like an empty table.
   *
   * `DataTable` created the query but never read `query.isError`, so a 500, a dropped
   * connection or a validation error on the list endpoint fell through to `<EmptyTable />`
   * and rendered "No results." — the exact confusion `App.tsx` says `ProtectedRoute` was
   * added to prevent for the 403 case ("the 403 surfaced as an empty table, which reads as
   * 'no data'"). ProtectedRoute only covers permissions; everything else landed here.
   *
   * Every table screen in the app inherits this, so these live in the shared suite.
   */
  it("renders an error state, NOT the empty message, when the fetch rejects", async () => {
    const fetchData = vi.fn().mockRejectedValue(new ApiError("boom", 500));
    renderWithProviders(
      <DataTable
        columns={columns}
        fetchData={fetchData}
        tableId="rows"
        emptyMessage="Nothing here."
      />,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Nothing here.")).not.toBeInTheDocument();
    expect(screen.queryByText(/no results/i)).not.toBeInTheDocument();
  });

  it("shows the friendly line for a server fault rather than the raw wire message", async () => {
    const fetchData = vi.fn().mockRejectedValue(new ApiError("relation does not exist", 500));
    renderWithProviders(<DataTable columns={columns} fetchData={fetchData} tableId="rows" />);

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/relation does not exist/)).not.toBeInTheDocument();
  });

  it("offers a Retry that re-invokes the fetcher", async () => {
    const fetchData = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("boom", 500))
      .mockResolvedValue({ rows: data, pageCount: 1, totalCount: 2 });

    renderWithProviders(<DataTable columns={columns} fetchData={fetchData} tableId="rows" />);
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides pagination while the fetch is failing", async () => {
    const fetchData = vi.fn().mockRejectedValue(new ApiError("boom", 500));
    renderWithProviders(<DataTable columns={columns} fetchData={fetchData} tableId="rows" />);
    await screen.findByRole("alert");
    expect(screen.queryByText(/page 1 of/i)).not.toBeInTheDocument();
  });

  it("refreshTrigger bump triggers a refetch and clears selection", async () => {
    const fetchData = vi.fn().mockResolvedValue({ rows: data, pageCount: 1 });
    const { rerender } = renderWithProviders(
      <DataTable columns={columns} fetchData={fetchData} tableId="rows" refreshTrigger={0} />,
    );
    await screen.findByText("Ada Lovelace");

    await userEvent.click(screen.getByRole("checkbox", { name: /select row 1/i }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    rerender(
      <DataTable columns={columns} fetchData={fetchData} tableId="rows" refreshTrigger={1} />,
    );

    await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  /**
   * The query is keyed on `["table-data", tableId, fetchOptions]` — `fetchOptions` is built
   * purely from the table's OWN internal state (paging/search/sort/filters), never from
   * `fetchData` itself. So a new `fetchData` CLOSURE with different captured params (a
   * franchise scope, a category id) changes nothing react-query looks at, and the table
   * keeps rendering the stale cached page.
   *
   * This is exactly the bug several master screens shipped with: `Routes`/`Branches`/
   * `Shifts`/`Stops`/`TransportAssets`/`TransportAssetTypes`/`crew-page` all rebuilt
   * `fetchData` from `tableFetcher(PATH, { franchiseId })` on every render but kept a
   * STATIC `tableId`, so a super admin switching the Franchise dropdown got a fresh
   * fetcher whose result react-query never asked for — the list looked frozen, while
   * create (a plain one-shot `fetch`, not routed through this cache) used the new scope
   * immediately. `Parties`/`Addresses`/`Roles`/`Metadata`'s category tab had already
   * worked around it by folding the scope into `tableId`, which is the fix below proves.
   */
  it("does NOT refetch when only fetchData's identity changes - same tableId", async () => {
    const fetchDataA = vi.fn().mockResolvedValue({ rows: [data[0]], pageCount: 1 });
    const fetchDataB = vi.fn().mockResolvedValue({ rows: [data[1]], pageCount: 1 });
    const { rerender } = renderWithProviders(
      <DataTable columns={columns} fetchData={fetchDataA} tableId="rows" />,
    );
    await screen.findByText("Ada Lovelace");

    rerender(<DataTable columns={columns} fetchData={fetchDataB} tableId="rows" />);

    // A `waitFor` on an already-true assertion resolves on the FIRST tick — it proves
    // nothing about whether a refetch happened, since the pre-rerender text is still
    // there either way. Wait a real beat for react-query to have acted, THEN assert.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchDataB).not.toHaveBeenCalled();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("refetches with the new fetchData once tableId changes too - the fix every scoped screen needs", async () => {
    const fetchDataA = vi.fn().mockResolvedValue({ rows: [data[0]], pageCount: 1 });
    const fetchDataB = vi.fn().mockResolvedValue({ rows: [data[1]], pageCount: 1 });
    const { rerender } = renderWithProviders(
      <DataTable columns={columns} fetchData={fetchDataA} tableId="rows-fr-1" />,
    );
    await screen.findByText("Ada Lovelace");

    rerender(<DataTable columns={columns} fetchData={fetchDataB} tableId="rows-fr-2" />);

    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  /**
   * The tableId fix above stops the CACHE from serving a stale page, but says nothing about
   * a COLUMN FILTER — that lives in the table's own `columnFilters` state, independent of
   * `tableId`. A Branch filter typed while viewing franchise A survived a switch to
   * franchise B and rode along in `fetchOptions.filters`, silently narrowing B's query by an
   * id that only exists in A — every one of B's real rows disappeared, reading as "no
   * matching records" for data that plainly exists. Reported from production against the
   * Duty Allocations screen; reproduced here against the shared component every scoped
   * master page depends on.
   */
  it("clears column filters (and search, and the page) when tableId changes", async () => {
    const user = userEvent.setup();
    const filterableColumns: ColumnDef<Row, unknown>[] = [
      { accessorKey: "id", header: "ID" },
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        meta: { filterVariant: "text" },
      },
    ];
    const fetchDataA = vi.fn().mockResolvedValue({ rows: [data[0]], pageCount: 1 });
    const fetchDataB = vi.fn().mockResolvedValue({ rows: [data[1]], pageCount: 1 });
    const { rerender } = renderWithProviders(
      <DataTable columns={filterableColumns} fetchData={fetchDataA} tableId="rows-fr-A" />,
    );
    await screen.findByText("Ada Lovelace");

    await user.type(screen.getByPlaceholderText(/search name/i), "Ada");
    // The filter debounces at 500ms (`debounced-input.tsx`); wait it out before switching.
    await waitFor(
      () =>
        expect(fetchDataA).toHaveBeenLastCalledWith(
          expect.objectContaining({ filters: [expect.objectContaining({ field: "name" })] }),
        ),
      { timeout: 2000 },
    );

    rerender(<DataTable columns={filterableColumns} fetchData={fetchDataB} tableId="rows-fr-B" />);
    await screen.findByText("Grace Hopper");

    // Exactly one call: the reset happens DURING render (not in a `useEffect` after commit),
    // so `fetchOptions`/`useQuery`'s `queryKey` for the new `tableId` never gets built while
    // `columnFilters` still holds the old scope's value. A `toHaveBeenLastCalledWith` alone
    // would still pass if an earlier, mis-scoped call (old filter + new tableId) had fired and
    // been superseded — this pins that it never does.
    expect(fetchDataB).toHaveBeenCalledTimes(1);
    expect(fetchDataB).toHaveBeenCalledWith(expect.objectContaining({ filters: [] }));
    expect((screen.getByPlaceholderText(/search name/i) as HTMLInputElement).value).toBe("");
  });

  it("clears row selection when tableId changes", async () => {
    const user = userEvent.setup();
    const fetchDataA = vi.fn().mockResolvedValue({ rows: [data[0]], pageCount: 1 });
    const fetchDataB = vi.fn().mockResolvedValue({ rows: [data[1]], pageCount: 1 });
    const { rerender } = renderWithProviders(
      <DataTable
        columns={columns}
        fetchData={fetchDataA}
        tableId="rows-fr-A"
        showRowSelectionColumn
        getRowId={(row: Row) => row.id}
      />,
    );
    await screen.findByText("Ada Lovelace");

    // Row 0 is the "select all" header checkbox; row 1 is the first data row's own.
    await user.click(screen.getAllByRole("checkbox")[1]!);
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        fetchData={fetchDataB}
        tableId="rows-fr-B"
        showRowSelectionColumn
        getRowId={(row: Row) => row.id}
      />,
    );
    await screen.findByText("Grace Hopper");

    // `getRowId` keys selection off the row's own id, so a stale entry can't resolve to a
    // wrong-tenant row — but the "N selected" count is a raw key count regardless, so without
    // clearing it here the bar would keep showing "1 selected" with nothing checked on screen.
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });
});

describe("DataTable - expand, grouping, empty/loading, download, actions", () => {
  it("expands a row to show renderSubRow's content", async () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        getRowCanExpand={() => true}
        renderSubRow={(row) => <span>Details for {row.name}</span>}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /expand row/i })[0]!);
    expect(screen.getByText("Details for Ada Lovelace")).toBeInTheDocument();
  });

  it("renders group-header and child rows via rowGroupConfig", () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        rowGroupConfig={{
          getChildRows: (row) => [row],
          renderGroupHeader: (row) => <span>Group: {row.name}</span>,
          renderChildRow: (child) => <span>Child: {child.name}</span>,
        }}
      />,
    );

    expect(screen.getByText("Group: Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Child: Ada Lovelace")).toBeInTheDocument();
  });

  it("Download All calls onDownload and triggers a blob download", async () => {
    const onDownload = vi.fn().mockResolvedValue(new Blob(["x"]));
    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        downloadAllConfig={{ onDownload, filename: "vehicles.xlsx" }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /download all/i }));
    await waitFor(() => expect(onDownload).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("overflows primary actions beyond the 3rd into the '...' menu alongside secondary actions", async () => {
    const makeAction = (label: string): TableAction<Row> => ({ label, onClick: vi.fn() });
    const primaryActions = [
      makeAction("One"),
      makeAction("Two"),
      makeAction("Three"),
      makeAction("Four"),
    ];
    const secondaryActions = [makeAction("Five")];

    renderWithProviders(
      <DataTable
        columns={columns}
        data={data}
        primaryActions={primaryActions}
        secondaryActions={secondaryActions}
      />,
    );

    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Four" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /more actions/i }));
    expect(screen.getByRole("menuitem", { name: "Four" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Five" })).toBeInTheDocument();
  });
});

describe("DataTable - loading", () => {
  it("holds the pagination bar's place with a skeleton while the first page loads", async () => {
    const first = deferred<{ rows: Row[]; pageCount: number }>();
    const fetchData = vi.fn(() => first.promise);
    const { container } = renderWithProviders(
      <DataTable columns={columns} fetchData={fetchData} tableId="loading-pagination" />,
    );

    expect(container.querySelector(".row-start-4 .animate-pulse")).not.toBeNull();
    expect(screen.queryByText("Rows per page")).not.toBeInTheDocument();

    first.resolve({ rows: data, pageCount: 1 });
    expect(await screen.findByText("Rows per page")).toBeInTheDocument();
    expect(container.querySelector(".row-start-4 .animate-pulse")).toBeNull();
  });
});

describe("DataTable - the row-actions column", () => {
  it("is pinned to the right edge and last, even when a screen put it first and gave it no meta", () => {
    const cols: ColumnDef<Row, unknown>[] = [
      { id: "actions", header: "Actions", cell: () => <button type="button">Edit row</button> },
      { accessorKey: "id", header: "ID" },
      { accessorKey: "name", header: "Name" },
    ];
    renderWithProviders(<DataTable columns={cols} data={data} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers[headers.length - 1]).toHaveTextContent("Actions");
    expect(headers[headers.length - 1].className).toContain("sticky");
    expect(headers[0]).not.toHaveTextContent("Actions");
  });
});
