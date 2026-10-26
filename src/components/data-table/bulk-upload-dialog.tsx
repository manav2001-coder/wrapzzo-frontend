import * as React from "react";

import { FileUploadDialog } from "@/components/file-upload-dialog";
import type { BulkUploadConfig } from "@/components/data-table/types";

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  config: BulkUploadConfig;
  onDone: () => void;
}

export function BulkUploadDialog({ open, onClose, config, onDone }: BulkUploadDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    success: number;
    errors?: { row: number; message: string }[];
  } | null>(null);

  const handleUploadAll = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const outcome = await config.onUpload(file);
      setResult(outcome);
      if (!outcome.errors?.length) onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FileUploadDialog
      open={open}
      onClose={onClose}
      title={config.label ?? "Bulk upload"}
      multiple={false}
      onUploadAll={handleUploadAll}
      loading={loading}
      error={error}
      footer={
        result && (
          <p className="text-sm text-muted-foreground" role="status">
            {result.success} row{result.success === 1 ? "" : "s"} uploaded
            {result.errors?.length ? `, ${result.errors.length} failed` : ""}.
          </p>
        )
      }
    />
  );
}
