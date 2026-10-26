import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DebouncedInput } from "./debounced-input";

afterEach(() => vi.useRealTimers());

describe("DebouncedInput", () => {
  it.each(["sm", "default"] as const)(
    "reserves translated placeholder space at %s size without exposing duplicate text",
    (size) => {
      const placeholder = "Search vehicle registration number";
      const { container } = render(
        <DebouncedInput
          value=""
          onFilterChange={vi.fn()}
          fitPlaceholder
          size={size}
          placeholder={placeholder}
        />,
      );
      const ghost = container.querySelector('span[aria-hidden="true"]')!;
      const input = screen.getByRole("textbox");
      expect(ghost).toHaveTextContent(placeholder);
      expect(ghost).toHaveClass(
        "invisible",
        "w-max",
        "whitespace-pre",
        size === "sm" ? "pl-7" : "pl-8",
      );
      expect(input).toHaveClass("absolute", "inset-0", size === "sm" ? "pl-7" : "pl-8");
      expect(input.parentElement).toHaveClass("min-w-max");
    },
  );

  it("keeps ordinary inputs in normal flow", () => {
    const { container } = render(
      <DebouncedInput value="" onFilterChange={vi.fn()} showIcon={false} />,
    );
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
    expect(screen.getByRole("textbox")).not.toHaveClass("absolute");
  });

  it("debounces typing and immediately applies an external reset", () => {
    vi.useFakeTimers();
    const onFilterChange = vi.fn();
    const { rerender } = render(
      <DebouncedInput value="" onFilterChange={onFilterChange} fitPlaceholder resetKey={0} />,
    );
    act(() => vi.advanceTimersByTime(500));
    expect(onFilterChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "vehicle" } });
    act(() => vi.advanceTimersByTime(499));
    expect(onFilterChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onFilterChange).toHaveBeenLastCalledWith("vehicle");
    rerender(
      <DebouncedInput value="" onFilterChange={onFilterChange} fitPlaceholder resetKey={1} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(onFilterChange).toHaveBeenLastCalledWith("");
  });
});
