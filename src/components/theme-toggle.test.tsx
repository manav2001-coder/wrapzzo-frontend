import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "./theme-toggle";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme, resolvedTheme: "light" }) }));

describe("ThemeToggle", () => {
  it("toggles to the opposite theme", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: /toggle theme/i }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  /**
   * The landing header is a fixed dark-navy zone in BOTH themes, where the ghost variant's
   * `text-foreground` is near-invisible in light mode. Forwarding `className` is what lets a
   * caller recolour it for that surface.
   */
  it("forwards a className so it can sit on a dark surface", () => {
    renderWithProviders(<ThemeToggle className="text-sidebar-text" />);

    expect(screen.getByRole("button", { name: /toggle theme/i })).toHaveClass("text-sidebar-text");
  });

  it("still renders with no props at all", () => {
    renderWithProviders(<ThemeToggle />);

    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });
});
