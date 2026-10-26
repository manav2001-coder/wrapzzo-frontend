import userEvent from "@testing-library/user-event";
import { User } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { AppTabs, type AppTabItem } from "./app-tabs";

const tabs: AppTabItem[] = [
  { value: "profile", label: "Profile", icon: User, content: <p>Profile panel</p> },
  { value: "settings", label: "Settings", badge: 3, content: <p>Settings panel</p> },
  { value: "billing", label: "Billing", disabled: true, content: <p>Billing panel</p> },
];

describe("AppTabs", () => {
  it("renders every trigger and selects the first enabled tab", () => {
    renderWithProviders(<AppTabs tabs={tabs} />);
    expect(screen.getByRole("tab", { name: /Profile/ })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Profile panel")).toBeInTheDocument();
    expect(screen.queryByText("Settings panel")).not.toBeInTheDocument();
  });

  it("renders a badge and disables a disabled tab", () => {
    renderWithProviders(<AppTabs tabs={tabs} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Billing/ })).toBeDisabled();
  });

  it("switches panels on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppTabs tabs={tabs} />);

    await user.click(screen.getByRole("tab", { name: /Settings/ }));
    await waitFor(() => expect(screen.getByText("Settings panel")).toBeInTheDocument());
  });

  it("honours defaultValue", () => {
    renderWithProviders(<AppTabs tabs={tabs} defaultValue="settings" />);
    expect(screen.getByText("Settings panel")).toBeInTheDocument();
  });

  it("supports controlled usage", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<AppTabs tabs={tabs} value="profile" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("tab", { name: /Settings/ }));
    expect(onValueChange).toHaveBeenCalledWith("settings");
    // Still showing the controlled value — the parent owns it.
    expect(screen.getByText("Profile panel")).toBeInTheDocument();
  });

  it("renders a bar only when no tab supplies content", () => {
    renderWithProviders(
      <AppTabs
        tabs={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });

  it("applies the underline variant by default and pills when asked", () => {
    const { rerender } = renderWithProviders(<AppTabs tabs={tabs} />);
    expect(screen.getByRole("tablist")).toHaveClass("border-b");

    rerender(<AppTabs tabs={tabs} variant="pills" />);
    expect(screen.getByRole("tablist")).not.toHaveClass("border-b");
  });

  it("stretches triggers when fullWidth", () => {
    renderWithProviders(<AppTabs tabs={tabs} fullWidth />);
    expect(screen.getByRole("tablist")).toHaveClass("w-full");
    expect(screen.getByRole("tab", { name: /Profile/ })).toHaveClass("flex-1");
  });
});
