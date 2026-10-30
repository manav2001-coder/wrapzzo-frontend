import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";

const useCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser }));

import { PermissionGate } from "./permission-gate";

function signedInWith(permissions: string[], roles: string[] = []) {
  useCurrentUser.mockReturnValue({ data: { roles, permissions }, isLoading: false });
}

describe("PermissionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedInWith(["user.view"]);
  });

  it("renders children for a permission the caller holds", () => {
    renderWithProviders(
      <PermissionGate permission="user.view">
        <span>gated</span>
      </PermissionGate>,
    );
    expect(screen.getByText("gated")).toBeInTheDocument();
  });

  it("hides children - and shows the fallback - when they do not", () => {
    renderWithProviders(
      <PermissionGate permission="user.delete" fallback={<span>denied</span>}>
        <span>gated</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("gated")).not.toBeInTheDocument();
    expect(screen.getByText("denied")).toBeInTheDocument();
  });

  it("renders unconditionally when BOTH permission props are omitted", () => {
    // `TableAction.permission` is optional; an absent requirement means "no gate", and
    // treating it as a denial would hide every unguarded action in the app.
    renderWithProviders(
      <PermissionGate>
        <span>ungated</span>
      </PermissionGate>,
    );
    expect(screen.getByText("ungated")).toBeInTheDocument();
  });

  it("FAILS CLOSED on an explicitly empty permissions array", () => {
    // An empty array is a computed value that came back empty, not an author saying
    // "ungated". Opening the gate here is how a gate silently stops gating.
    renderWithProviders(
      <PermissionGate permissions={[]}>
        <span>gated</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("gated")).not.toBeInTheDocument();
  });

  it("treats a permissions array as ANY-of, and requireAll as ALL-of", () => {
    const any = renderWithProviders(
      <PermissionGate permissions={["user.view", "user.delete"]}>
        <span>any</span>
      </PermissionGate>,
    );
    expect(any.getByText("any")).toBeInTheDocument();

    renderWithProviders(
      <PermissionGate permissions={["user.view", "user.delete"]} requireAll>
        <span>all</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("all")).not.toBeInTheDocument();
  });

  it("gives platform staff no bypass: they pass only on keys the API granted them", () => {
    useCurrentUser.mockReturnValue({ data: { companyId: null, permissions: [] }, isLoading: false });
    renderWithProviders(
      <PermissionGate permission="platform_company.view">
        <span>staff</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("staff")).not.toBeInTheDocument();
  });
});
