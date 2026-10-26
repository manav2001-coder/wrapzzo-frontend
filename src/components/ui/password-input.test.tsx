import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";

import { render, screen } from "@/test/test-utils";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("renders masked by default", () => {
    render(
      <PasswordInput showLabel="Show password" hideLabel="Hide password" readOnly value="secret" />,
    );
    expect(screen.getByDisplayValue("secret")).toHaveAttribute("type", "password");
  });

  it("reveals the value on toggle, and masks it again on a second click", async () => {
    render(
      <PasswordInput showLabel="Show password" hideLabel="Hide password" readOnly value="secret" />,
    );
    const toggle = screen.getByRole("button", { name: /show password/i });

    await userEvent.click(toggle);
    expect(screen.getByDisplayValue("secret")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByDisplayValue("secret")).toHaveAttribute("type", "password");
  });

  /*
   * The regression this whole component exists to prevent from recurring: an
   * `aria-label="Show password"` on the toggle button would give every existing
   * `getByLabelText(/password/i)` query in the app (Login, Set Password, Reset Password)
   * a SECOND match — the button, alongside the actual field — and turn a passing suite
   * into a strict-mode violation the moment this landed.
   */
  it("does not give the toggle button an accessible name that collides with the field's own label", () => {
    render(
      <div>
        <label htmlFor="pw">Password</label>
        <PasswordInput
          id="pw"
          showLabel="Show password"
          hideLabel="Hide password"
          readOnly
          value="secret"
        />
      </div>,
    );
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });

  /** Whatever `FormControl` clones in must land on the real `<input>`, not the wrapper `<div>` — the same trap `LookupCombobox`/`ValueCombobox`/`PhoneField` already document. */
  it("forwards id/aria-describedby/aria-invalid onto the input, not the wrapper", () => {
    render(
      <PasswordInput
        id="pw"
        aria-describedby="pw-help"
        aria-invalid
        showLabel="Show password"
        hideLabel="Hide password"
        readOnly
        value="secret"
      />,
    );
    const input = screen.getByDisplayValue("secret");
    expect(input).toHaveAttribute("id", "pw");
    expect(input).toHaveAttribute("aria-describedby", "pw-help");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
