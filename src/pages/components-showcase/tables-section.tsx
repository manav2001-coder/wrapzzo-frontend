import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { EmptyTable } from "@/components/data-table/empty-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ListFieldMap } from "@/lib/list-fields";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";
import { ORDERS, type DemoOrder } from "@/pages/components-showcase/demo-data";

const STATUS_VARIANT: Record<
  DemoOrder["status"],
  "success" | "warning" | "secondary" | "destructive"
> = {
  processing: "warning",
  dispatched: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

/**
 * What each column holds, which is what lets the table derive each column's filter control and
 * sortability instead of every screen declaring them. `placedOn` is `text` rather than `date` on
 * purpose: this demo is CLIENT mode, so TanStack filters the rows locally and a `[from, to]`
 * range value has no local filter fn to match it.
 */
const listFields: ListFieldMap = {
  orderNo: "text",
  recipient: "text",
  gift: "text",
  vendor: "text",
  status: "enum",
  placedOn: "text",
};

const columns: ColumnDef<DemoOrder, unknown>[] = [
  { accessorKey: "orderNo", header: "Order" },
  { accessorKey: "recipient", header: "Recipient" },
  { accessorKey: "gift", header: "Gift" },
  { accessorKey: "vendor", header: "Vendor" },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      filterVariant: "select",
      filterOptions: [
        { value: "processing", label: "Processing" },
        { value: "dispatched", label: "Dispatched" },
        { value: "delivered", label: "Delivered" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    cell: ({ getValue }) => {
      const status = getValue<DemoOrder["status"]>();
      return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
    },
  },
  { accessorKey: "placedOn", header: "Placed on" },
];

// Fake latency, no network — this is a UI-kit demo, not a real integration.
const fakeDownload = () =>
  new Promise<Blob>((resolve) =>
    setTimeout(() => resolve(new Blob(["order_no,recipient\n"], { type: "text/csv" })), 1200),
  );

const fakeUpload = () =>
  new Promise<{ success: number; errors?: { row: number; message: string }[] }>((resolve) =>
    setTimeout(
      () => resolve({ success: 4, errors: [{ row: 5, message: "Missing recipient phone" }] }),
      1200,
    ),
  );

export function TablesSection() {
  return (
    <section id="tables" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Tables</h2>

      <ComponentDemo
        title="DataTable"
        description="Client-mode table with sortable headers, a search box per column, row selection, bulk upload and download-all. `listFields` decides which columns get a filter and which can sort. Every cell is one truncated line, so rows stay one height and the table scrolls sideways; drag a header's right edge to resize a column (double-click resets it) and drag a header to reorder. With `configNamespace` each user's widths, order and hidden columns are remembered in this browser, and the Columns menu can reset them. Handlers here are fake and network-free."
        code={`<DataTable
  columns={columns}
  data={ORDERS}
  listFields={listFields}
  configNamespace="components-demo-orders"
  pageSize={3}
  bulkUploadConfig={{ label: "Bulk upload", onUpload: fakeUpload }}
  downloadAllConfig={{ label: "Download all", onDownload: fakeDownload, filename: "orders.csv" }}
/>`}
        className="max-w-3xl"
      >
        <div className="w-full">
          <DataTable
            columns={columns}
            data={ORDERS}
            listFields={listFields}
            configNamespace="components-demo-orders"
            pageSize={3}
            bulkUploadConfig={{ label: "Bulk upload", onUpload: fakeUpload }}
            downloadAllConfig={{
              label: "Download all",
              onDownload: fakeDownload,
              filename: "orders.csv",
            }}
          />
        </div>
      </ComponentDemo>
      <ComponentDemo
        title="EmptyTable"
        description="The no-rows body, extracted from DataTable so lists and cards can reuse it. Pass `emptyState` to replace it entirely."
        code={`<DataTable
  columns={columns}
  data={[]}
  emptyState={<EmptyTable message="No orders yet" description="Send a Quick Gift to get started." action={<Button size="sm">Send a gift</Button>} />}
/>`}
      >
        <DataTable<DemoOrder>
          columns={columns}
          data={[]}
          emptyState={
            <EmptyTable
              message="No orders yet"
              description="Send a Quick Gift to get started."
              action={
                <Button size="sm" variant="outline">
                  Send a gift
                </Button>
              }
            />
          }
        />
      </ComponentDemo>
    </section>
  );
}
