import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { FileUploadDialog } from "./file-upload-dialog";

function makeFile(name: string) {
  return new File(["content"], name, { type: "text/csv" });
}

describe("FileUploadDialog", () => {
  it("adds a dropped/selected file to the pending list", async () => {
    renderWithProviders(<FileUploadDialog open onClose={vi.fn()} onUploadAll={vi.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile("drivers.csv"));

    expect(await screen.findByText(/drivers\.csv/)).toBeInTheDocument();
  });

  it("calls onUploadAll with the file array when Upload is clicked", async () => {
    const onUploadAll = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<FileUploadDialog open onClose={vi.fn()} onUploadAll={onUploadAll} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("drivers.csv");
    await userEvent.upload(input, file);
    await userEvent.click(await screen.findByRole("button", { name: /upload/i }));

    expect(onUploadAll).toHaveBeenCalledWith([file]);
  });

  it("disables the upload button while loading", () => {
    renderWithProviders(<FileUploadDialog open onClose={vi.fn()} onUploadAll={vi.fn()} loading />);
    expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();
  });
});
