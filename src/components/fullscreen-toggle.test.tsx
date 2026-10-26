import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { FullscreenToggle } from "./fullscreen-toggle";

function setFullscreenElement(value: Element | null) {
  Object.defineProperty(document, "fullscreenElement", { value, configurable: true });
}

describe("FullscreenToggle", () => {
  afterEach(() => {
    setFullscreenElement(null);
    vi.restoreAllMocks();
  });

  it("offers to enter fullscreen when not in it", () => {
    renderWithProviders(<FullscreenToggle />);
    const button = screen.getByRole("button", { name: "Enter fullscreen" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("requests fullscreen on click", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(document.documentElement, "requestFullscreen").mockResolvedValue();

    renderWithProviders(<FullscreenToggle />);
    await user.click(screen.getByRole("button", { name: "Enter fullscreen" }));

    expect(request).toHaveBeenCalled();
  });

  it("exits fullscreen when already in it", async () => {
    const user = userEvent.setup();
    setFullscreenElement(document.documentElement);
    const exit = vi.spyOn(document, "exitFullscreen").mockResolvedValue();

    renderWithProviders(<FullscreenToggle />);
    const button = screen.getByRole("button", { name: "Exit fullscreen" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);
    expect(exit).toHaveBeenCalled();
  });

  it("reacts to a fullscreenchange event from elsewhere", async () => {
    renderWithProviders(<FullscreenToggle />);
    expect(screen.getByRole("button", { name: "Enter fullscreen" })).toBeInTheDocument();

    setFullscreenElement(document.documentElement);
    document.dispatchEvent(new Event("fullscreenchange"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument(),
    );
  });

  // StrictMode double-mounts in dev, so a leaked listener would fire twice.
  it("removes its listener on unmount", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderWithProviders(<FullscreenToggle />);
    unmount();
    expect(remove).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
  });

  it("does not throw where the Fullscreen API is missing", async () => {
    const user = userEvent.setup();
    const original = document.documentElement.requestFullscreen;
    // @ts-expect-error — deliberately removing the API to mimic an embedded webview.
    document.documentElement.requestFullscreen = undefined;

    try {
      renderWithProviders(<FullscreenToggle />);
      await expect(
        user.click(screen.getByRole("button", { name: "Enter fullscreen" })),
      ).resolves.not.toThrow();
    } finally {
      document.documentElement.requestFullscreen = original;
    }
  });
});
