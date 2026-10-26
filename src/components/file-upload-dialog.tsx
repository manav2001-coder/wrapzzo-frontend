import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Trash2, UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  onUploadAll: (files: File[]) => Promise<void>;
  /** Matches a TanStack Query useMutation's shape so callers can wire it directly. */
  loading?: boolean;
  error?: string | null;
  /** Rendered below the file list, inside the dialog (e.g. a post-upload result summary). */
  footer?: React.ReactNode;
}

/**
 * Scoped-down replacement for v4's CustomFileManager: no stepper mode, no template
 * download, no per-file progress (v4's assumed a per-file upload API this app doesn't
 * have) — a single dialog-level loading/error pair matches what a useMutation naturally
 * exposes, so the DataTable v2 bulk-upload dialog can wire mutation.mutate/.isPending/
 * .error directly with no adapter code.
 */
export function FileUploadDialog({
  open,
  onClose,
  title = "Upload files",
  multiple = true,
  accept,
  onUploadAll,
  loading,
  error,
  footer,
}: FileUploadDialogProps) {
  const [files, setFiles] = React.useState<File[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple,
    accept,
    onDrop: (accepted) => setFiles((prev) => (multiple ? [...prev, ...accepted] : accepted)),
  });

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    await onUploadAll(files);
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input p-8 text-center text-sm text-muted-foreground transition-colors",
            isDragActive && "border-primary bg-accent",
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-8 w-8" />
          <span>Drag files here, or click to browse</span>
        </div>

        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">
                  {file.name}{" "}
                  <span className="text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {footer}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={loading || files.length === 0}>
            {loading && <Loader2 className="animate-spin" />}
            Upload{multiple && files.length > 1 ? ` all (${files.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
