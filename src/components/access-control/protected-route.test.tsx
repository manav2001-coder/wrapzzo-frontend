import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";

const useCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser }));

import { ProtectedRoute } from "./protected-route";

describe("ProtectedRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the screen for a caller who holds the permission", () => {
    useCurrentUser.mockReturnValue({
      data: { roles: [], permissions: ["audit.view"] },
      isLoading: false,
    });
    renderWithProviders(
      <ProtectedRoute permission="audit.view">
        <h1>Audit log</h1>
      </ProtectedRoute>,
    );
    expect(screen.getByRole("heading", { name: "Audit log" })).toBeInTheDocument();
  });

  it("shows Access Denied - keeping the URL - rather than redirecting", () => {
    // A redirect destroys the URL, so a shared or bookmarked link lands on the dashboard
    // with no explanation of what happened.
    useCurrentUser.mockReturnValue({ data: { roles: [], permissions: [] }, isLoading: false });
    renderWithProviders(
      <ProtectedRoute permission="audit.view">
        <h1>Audit log</h1>
      </ProtectedRoute>,
    );

    expect(screen.queryByRole("heading", { name: "Audit log" })).not.toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    // And a way out, plus an explanation of who can fix it.
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByText(/ask your company admin/i)).toBeInTheDocument();
  });

  it("shows neither the screen nor the denial while permissions are still loading", () => {
    // Flashing Access Denied at someone who does have access is worse than a skeleton.
    useCurrentUser.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(
      <ProtectedRoute permission="audit.view">
        <h1>Audit log</h1>
      </ProtectedRoute>,
    );
    expect(screen.queryByRole("heading", { name: "Audit log" })).not.toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("renders an ungated route for anyone", () => {
    useCurrentUser.mockReturnValue({ data: { roles: [], permissions: [] }, isLoading: false });
    renderWithProviders(
      <ProtectedRoute>
        <h1>Public</h1>
      </ProtectedRoute>,
    );
    expect(screen.getByRole("heading", { name: "Public" })).toBeInTheDocument();
  });
});
