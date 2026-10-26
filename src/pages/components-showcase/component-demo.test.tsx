import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { ComponentDemo } from "./component-demo";

describe("ComponentDemo", () => {
  it("hides the code panel by default and reveals it on toggle", async () => {
    renderWithProviders(
      <ComponentDemo title="TextField" code="<TextField />">
        <span>live demo</span>
      </ComponentDemo>,
    );

    expect(screen.queryByText("<TextField />")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /view code/i }));
    expect(screen.getByText("<TextField />")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /hide code/i }));
    expect(screen.queryByText("<TextField />")).not.toBeInTheDocument();
  });
});
