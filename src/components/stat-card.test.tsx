import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bus } from "lucide-react";

import { renderWithProviders } from "@/test/test-utils";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renders title, value, and description", () => {
    renderWithProviders(
      <StatCard title="Active vehicles" value={42} description="Across all branches" />,
    );

    expect(screen.getByText("Active vehicles")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Across all branches")).toBeInTheDocument();
  });

  it("shows a skeleton instead of the value while loading", () => {
    renderWithProviders(<StatCard title="Active vehicles" value={42} loading />);
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders the icon (regression: v4's MetricCard declared but never rendered it)", () => {
    renderWithProviders(<StatCard title="Active vehicles" value={42} icon={Bus} />);
    expect(document.querySelector(".lucide-bus")).toBeInTheDocument();
  });

  it("is clickable with role=button and fires onClick", async () => {
    const onClick = vi.fn();
    renderWithProviders(<StatCard title="Active vehicles" value={42} onClick={onClick} />);

    const card = screen.getByRole("button");
    await userEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });
});
