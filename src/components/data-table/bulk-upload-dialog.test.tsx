import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { BulkUploadDialog } from "./bulk-upload-dialog";

function makeFile(name: string) {
  return new File(["content"], name, { type: "text/csv" });
}

describe("BulkUploadDialog", () => {
  it("calls onUpload with the selected file and renders a success/error summary", async () => {
    const onUpload = vi
      .fn()
      .mockResolvedValue({ success: 3, errors: [{ row: 4, message: "Missing name" }] });
    renderWithProviders(
      <BulkUploadDialog open onClose={vi.fn()} onDone={vi.fn()} config={{ onUpload }} />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile("drivers.csv"));
    await userEvent.click(await screen.findByRole("button", { name: /upload/i }));

    expect(onUpload).toHaveBeenCalledWith(expect.any(File));
    expect(await screen.findByRole("status")).toHaveTextContent("3 rows uploaded, 1 failed.");
  });
});
