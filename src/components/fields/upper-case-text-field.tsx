import * as React from "react";

import { TextField, type TextFieldProps } from "@/components/fields/text-field";

export interface UpperCaseTextFieldProps extends Omit<TextFieldProps, "value" | "onChange"> {
  value: string;
  /** Called with the upper-cased value. */
  onChange: (value: string) => void;
}

/**
 * A `TextField` that upper-cases what is typed, so what is on screen is what is stored (an
 * asset code, say).
 *
 * Upper-casing in a controlled input's `onChange` hands React a value that differs from the
 * DOM's, and React then rewrites the DOM value, which puts the caret at the END: a letter typed
 * in the middle of an existing code would send the cursor away. Upper-casing never changes the
 * length, so the caret the user had is put back after React has committed the new value.
 */
export function UpperCaseTextField({ value, onChange, ...props }: UpperCaseTextFieldProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const caret = React.useRef<{ start: number | null; end: number | null } | null>(null);

  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || !caret.current) return;
    input.setSelectionRange(caret.current.start, caret.current.end);
    caret.current = null;
  });

  return (
    <TextField
      {...props}
      ref={(node) => {
        inputRef.current = node as HTMLInputElement | null;
      }}
      value={value}
      onChange={(event) => {
        caret.current = { start: event.target.selectionStart, end: event.target.selectionEnd };
        onChange(event.target.value.toUpperCase());
      }}
    />
  );
}
