import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/test-utils";

const useCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser }));

import { PermissionButton } from "./permission-button";

function signedInWith(permissions: string[], roles: string[] = []) {
  useCurrentUser.mockReturnValue({ data: { roles, permissions }, isLoading: false });
}

describe("PermissionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedInWith(["user.create"]);
  });

  it("is enabled and clickable with the permission", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(
      <PermissionButton permission="user.create" onClick={onClick}>
        Add user
      </PermissionButton>,
    );

    const button = screen.getByRole("button", { name: "Add user" });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("DISABLES rather than hides by default - a row action leaving a gap is worse", () => {
    renderWithProviders(
      <PermissionButton permission="user.delete">Delete</PermissionButton>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("hides entirely with hideIfNoPermission - for an action nobody should know exists", () => {
    renderWithProviders(
      <PermissionButton permission="user.delete" hideIfNoPermission>
        Delete
      </PermissionButton>,
    );
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("explains the disabled state on hover", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PermissionButton permission="user.delete">Delete</PermissionButton>,
    );
    // A disabled button emits no pointer events, so the trigger wraps it in a span —
    // without that wrapper the tooltip explaining WHY would never appear.
    await user.hover(screen.getByRole("button", { name: "Delete" }).parentElement!);
    expect(await screen.findByText(/don't have permission/i)).toBeInTheDocument();
  });

  it("renders normally when no permission is specified at all", () => {
    renderWithProviders(<PermissionButton>Ungated</PermissionButton>);
    expect(screen.getByRole("button", { name: "Ungated" })).toBeEnabled();
  });

  it("stays disabled when the caller passes disabled, even holding the permission", () => {
    renderWithProviders(
      <PermissionButton permission="user.create" disabled>
        Add user
      </PermissionButton>,
    );
    expect(screen.getByRole("button", { name: "Add user" })).toBeDisabled();
  });

});
