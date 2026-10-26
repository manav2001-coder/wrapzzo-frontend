import * as React from "react";

import { AppDialog } from "@/components/app-dialog";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/file-dropzone";
import { FileUploadDialog } from "@/components/file-upload-dialog";
import { ItemListDialog } from "@/components/item-list-dialog";
import { MultiValuePopoverCell } from "@/components/multi-value-popover-cell";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

export function OverlaysSection() {
  const [listOpen, setListOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [dialogSize, setDialogSize] = React.useState<"md" | "lg" | null>(null);
  const [busyOpen, setBusyOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  return (
    <section id="overlays" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Overlays</h2>

      <ComponentDemo
        title="ItemListDialog"
        description="Generic 'show a list of strings in a modal' pattern."
        code={`<ItemListDialog open={open} onClose={close} title="Gifts in Diwali 2026" items={["Festive Hamper", "Diya Set", "Dry Fruit Box"]} />`}
      >
        <Button variant="outline" onClick={() => setListOpen(true)}>
          View gifts in Diwali 2026
        </Button>
        <ItemListDialog
          open={listOpen}
          onClose={() => setListOpen(false)}
          title="Gifts in Diwali 2026"
          items={["Festive Hamper", "Diya Set", "Dry Fruit Box"]}
        />
      </ComponentDemo>

      <ComponentDemo
        title="FileUploadDialog"
        description="Multi-file upload dialog (fake handler, no network)."
        code={`<FileUploadDialog open={open} onClose={close} title="Bulk upload employee roster" onUploadAll={async (files) => { /* ... */ }} />`}
      >
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          Upload employee roster
        </Button>
        <FileUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          title="Bulk upload employee roster"
          onUploadAll={async () => new Promise((resolve) => setTimeout(resolve, 800))}
        />
      </ComponentDemo>

      <ComponentDemo
        title="FileDropzone"
        description="Controlled single-file dropzone - caller owns the actual upload."
        code={`<FileDropzone file={file} onChange={setFile} />`}
      >
        <div className="w-72">
          <FileDropzone file={file} onChange={setFile} />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="MultiValuePopoverCell"
        description="Table-cell renderer: plain text for 1 value, a popover for 2+."
        code={`<MultiValuePopoverCell values={["Mumbai", "Pune", "Delhi"]} />
<MultiValuePopoverCell renderTable={[{ label: "Bottles", quantity: 30 }, { label: "Diaries", quantity: 10 }]} />`}
      >
        <MultiValuePopoverCell values={["Mumbai", "Pune", "Delhi"]} title="Cities served" />
        <MultiValuePopoverCell
          renderTable={[
            { label: "Bottles", quantity: 30 },
            { label: "Diaries", quantity: 10 },
          ]}
          title="Gift breakdown"
        />
      </ComponentDemo>
      <ComponentDemo
        title="AppDialog"
        description="Opinionated dialog: sizes, a confirm/cancel shorthand, loading and error states, and disableDismiss for flows that must end in an explicit choice."
        code={`<AppDialog
  open={open}
  onOpenChange={setOpen}
  title="Reject Quick Gift"
  description="QG-118 for Dr. Anjali Mehta will not become an order."
  size="md"
  confirmLabel="Reject"
  confirmVariant="destructive"
  onConfirm={reject}
  error={error}
/>`}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialogSize("md")}>
            Confirm dialog
          </Button>
          <Button variant="outline" onClick={() => setDialogSize("lg")}>
            Large + error
          </Button>
          <Button variant="outline" onClick={() => setBusyOpen(true)}>
            Loading, no dismissal
          </Button>
        </div>

        <AppDialog
          open={dialogSize !== null}
          onOpenChange={(next) => !next && setDialogSize(null)}
          title="Reject Quick Gift"
          description="QG-118 for Dr. Anjali Mehta will not become an order."
          size={dialogSize ?? "md"}
          confirmLabel="Reject"
          confirmVariant="destructive"
          error={dialogSize === "lg" ? "This request was already approved." : null}
          onConfirm={() => setDialogSize(null)}
        >
          <p className="text-sm text-muted-foreground">
            The requester sees your reason on their Quick Gift list.
          </p>
        </AppDialog>

        <AppDialog
          open={busyOpen}
          onOpenChange={setBusyOpen}
          title="Assigning vendors"
          loading
          onConfirm={() => undefined}
          footer={
            <Button variant="outline" onClick={() => setBusyOpen(false)}>
              Force close (demo only)
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            Escape and outside-click are blocked while loading.
          </p>
        </AppDialog>
      </ComponentDemo>
    </section>
  );
}
