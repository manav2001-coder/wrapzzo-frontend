import * as React from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Trash2, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface BaseProps {
  accept?: Record<string, string[]>;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** The drop-zone's own text. Defaults to English; a caller with a translation passes it. */
  prompt?: string;
}

/** One file, held by the caller as `File | null` — the original shape. */
interface SingleProps extends BaseProps {
  file: File | null;
  onChange: (file: File | null) => void;
  files?: undefined;
}

/**
 * Any number of files, held by the caller as a `File[]` — the shape a FORM field needs, because a
 * form that sends the file with its other values (Documents' upload) keeps the files in its own
 * state. The zone stays open after a choice so more can be added (`multiple`), the chosen files are
 * listed with a remove button each, and a file the \`accept\` filter turns away is SAID so, rather
 * than silently vanishing.
 */
interface ListProps extends BaseProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  multiple?: boolean;
  id?: string;
  /** The accessible name of one file's remove button. */
  removeLabel?: (fileName: string) => string;
  /** What to say about a file the \`accept\` filter turned away. */
  rejectedMessage?: (fileName: string) => string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export type FileDropzoneProps = SingleProps | ListProps;

const DEFAULT_PROMPT = "Drag a file here, or click to browse";

function fileSize(file: File): string {
  return `${Math.max(1, Math.round(file.size / 1024))} KB`;
}

/**
 * Controlled dropzone — no upload logic itself, caller owns the actual upload.
 *
 * Two shapes, one component: `file` / `onChange` for a single file (the original), and
 * `files` / `onFilesChange` for a list. They share the zone, its states and its translation, which
 * is why the list form is not a second component.
 */
export function FileDropzone(props: FileDropzoneProps) {
  const { t } = useTranslation();
  const { accept, error, disabled, className, prompt } = props;
  const listMode = props.files !== undefined;
  const [rejected, setRejected] = React.useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: listMode ? Boolean((props as ListProps).multiple) : false,
    accept,
    disabled,
    onDrop: (accepted, refused) => {
      if (props.files !== undefined) {
        setRejected(refused.map((entry) => entry.file.name));
        if (accepted.length > 0) {
          props.onFilesChange(
            props.multiple ? [...props.files, ...accepted] : accepted.slice(0, 1),
          );
        }
        return;
      }
      if (accepted[0]) props.onChange(accepted[0]);
    },
  });

  if (!listMode && (props as SingleProps).file) {
    const { file, onChange } = props as SingleProps;
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-md border border-input p-3 text-sm",
          className,
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          {file!.name} <span className="text-muted-foreground">({fileSize(file!)})</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label={t("a11y.removeFile")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const list = props.files !== undefined ? (props as ListProps) : null;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input p-6 text-center text-sm text-muted-foreground transition-colors",
            isDragActive && "border-primary bg-accent",
            (error || list?.["aria-invalid"]) && "border-destructive",
            disabled && "pointer-events-none opacity-50",
            className,
          )}
          aria-invalid={list?.["aria-invalid"]}
        >
          <input
            {...getInputProps(
              list ? { id: list.id, "aria-describedby": list["aria-describedby"] } : undefined,
            )}
          />
          <Upload className="h-6 w-6" />
          <span>{prompt ?? DEFAULT_PROMPT}</span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {list && list.rejectedMessage && rejected.length > 0 ? (
        <ul className="space-y-0.5" role="alert">
          {rejected.map((name) => (
            <li key={name} className="text-sm text-destructive">
              {list.rejectedMessage!(name)}
            </li>
          ))}
        </ul>
      ) : null}

      {list && list.files.length > 0 ? (
        <ul className="space-y-1">
          {list.files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate">
                {file.name} <span className="text-muted-foreground">({fileSize(file)})</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => list.onFilesChange(list.files.filter((_, i) => i !== index))}
                aria-label={list.removeLabel?.(file.name) ?? t("a11y.removeFile")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
