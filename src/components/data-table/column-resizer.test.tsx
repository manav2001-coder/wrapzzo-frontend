import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@/test/pointer-event";
import { renderWithProviders } from "@/test/test-utils";
import { MAX_COLUMN_SIZE, MIN_COLUMN_SIZE } from "./column-sizing";
import { ColumnResizer } from "./column-resizer";

function setup(width = 200, side?: "left" | "right") {
  const onResize = vi.fn();
  const onReset = vi.fn();
  renderWithProviders(
    <table style={{ width: 600 }}>
      <thead>
        <tr>
          <th style={{ width }}>
            <ColumnResizer
              width={width}
              label="Name"
              side={side}
              onResize={onResize}
              onReset={onReset}
            />
          </th>
        </tr>
      </thead>
    </table>,
  );
  return { handle: screen.getByRole("separator"), onResize, onReset };
}

describe("ColumnResizer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("commits one width on release, not one per pointer move", () => {
    const { handle, onResize } = setup();
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 130, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    expect(onResize).not.toHaveBeenCalled();

    fireEvent.pointerUp(handle, { clientX: 160, pointerId: 1 });
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith(260);
  });

  it("resizes the column live while dragging, then leaves the width to the commit", () => {
    const { handle } = setup();
    handle.setPointerCapture = vi.fn();
    const cell = handle.closest("th")!;

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });
    expect(cell.style.width).toBe("250px");

    fireEvent.pointerUp(handle, { clientX: 150, pointerId: 1 });
    expect(cell.style.width).toBe("200px");
  });

  it("widens a right-pinned column by dragging its left-edge handle leftward", () => {
    const { handle, onResize } = setup(140, "left");
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { button: 0, clientX: 500, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 450, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith(190);

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    act(() => vi.advanceTimersByTime(200));
    expect(onResize).toHaveBeenLastCalledWith(150);
  });

  it("clamps a drag to the narrowest and widest a column may be", () => {
    const { handle, onResize } = setup();
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { button: 0, clientX: 500, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: -5000, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith(MIN_COLUMN_SIZE);

    fireEvent.pointerDown(handle, { button: 0, clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 9000, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith(MAX_COLUMN_SIZE);
  });

  it("does nothing when released where it started", () => {
    const { handle, onResize } = setup();
    handle.setPointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 100, pointerId: 1 });
    expect(onResize).not.toHaveBeenCalled();
  });

  it("resizes from the keyboard and resets on double-click", () => {
    const { handle, onResize, onReset } = setup();

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(200));
    expect(onResize).toHaveBeenLastCalledWith(210);
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    act(() => vi.advanceTimersByTime(200));
    expect(onResize).toHaveBeenLastCalledWith(160);

    fireEvent.doubleClick(handle);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("commits a burst of arrow presses once, not once per press", () => {
    const { handle, onResize } = setup();

    for (let i = 0; i < 5; i++) fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onResize).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith(250);
  });

  it("does not hold a pending width back when the handle loses focus", () => {
    const { handle, onResize } = setup();

    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    fireEvent.blur(handle);
    expect(onResize).toHaveBeenCalledWith(240);
  });
});
