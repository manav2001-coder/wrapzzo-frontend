import { describe, expect, it } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";
import { OverlaysSection } from "./overlays-section";

describe("OverlaysSection", () => {
  it("renders every demo title", () => {
    renderWithProviders(<OverlaysSection />);
    [
      "ItemListDialog",
      "FileUploadDialog",
      "FileDropzone",
      "MultiValuePopoverCell",
      "AppDialog",
    ].forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
  });
});
