import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { FileDropzone } from "./file-dropzone";

describe("FileDropzone", () => {
  it("calls onChange with the selected file", async () => {
    const onChange = vi.fn();
    renderWithProviders(<FileDropzone file={null} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "pod.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("calls onChange(null) when the remove button is clicked", async () => {
    const onChange = vi.fn();
    const file = new File(["x"], "pod.pdf", { type: "application/pdf" });
    renderWithProviders(<FileDropzone file={file} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /remove file/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("renders the error message when provided", () => {
    renderWithProviders(<FileDropzone file={null} onChange={vi.fn()} error="File is required" />);
    expect(screen.getByText("File is required")).toBeInTheDocument();
  });
});

describe("FileDropzone - the list form a form field uses", () => {
  function Harness({
    multiple,
    accept,
  }: {
    multiple?: boolean;
    accept?: Record<string, string[]>;
  }) {
    const [files, setFiles] = React.useState<File[]>([]);
    return (
      <FileDropzone
        files={files}
        onFilesChange={setFiles}
        multiple={multiple}
        accept={accept}
        prompt="Drop files here"
        removeLabel={(name) => `Remove ${name}`}
        rejectedMessage={(name) => `${name} is not accepted`}
      />
    );
  }
  const pdf = (name: string) => new File(["%PDF-1.4"], name, { type: "application/pdf" });
  const input = () => document.querySelector("input[type=file]") as HTMLInputElement;

  it("lists the chosen file and lets it be removed", async () => {
    renderWithProviders(<Harness />);
    fireEvent.change(input(), { target: { files: [pdf("contract.pdf")] } });

    expect(await screen.findByText(/contract\.pdf/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove contract.pdf" }));
    expect(screen.queryByText(/contract\.pdf/)).not.toBeInTheDocument();
  });

  it("replaces the file when only one is allowed, and adds to the list when several are", async () => {
    const { unmount } = renderWithProviders(<Harness />);
    fireEvent.change(input(), { target: { files: [pdf("one.pdf")] } });
    await screen.findByText(/one\.pdf/);
    fireEvent.change(input(), { target: { files: [pdf("two.pdf")] } });
    await screen.findByText(/two\.pdf/);
    expect(screen.queryByText(/one\.pdf/)).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<Harness multiple />);
    fireEvent.change(input(), { target: { files: [pdf("one.pdf")] } });
    await screen.findByText(/one\.pdf/);
    fireEvent.change(input(), { target: { files: [pdf("two.pdf")] } });
    await screen.findByText(/two\.pdf/);
    expect(screen.getByText(/one\.pdf/)).toBeInTheDocument();
  });

  it("says so when a file is turned away by the accept filter, rather than dropping it silently", async () => {
    renderWithProviders(<Harness accept={{ "application/pdf": [".pdf"] }} />);
    fireEvent.change(input(), {
      target: { files: [new File(["x"], "virus.exe", { type: "application/x-msdownload" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("virus.exe is not accepted");
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });
});
