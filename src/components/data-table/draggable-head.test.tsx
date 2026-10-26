import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import "@/test/pointer-event";
import { renderWithProviders } from "@/test/test-utils";
import { DraggableHead } from "./draggable-head";

/** jsdom does no layout: give each header a 100px slot so "over column N" is meaningful. */
function setup() {
  const onMoveColumn = vi.fn();
  const onSort = vi.fn();
  renderWithProviders(
    <table>
      <thead>
        <tr>
          {["a", "b", "c"].map((id) => (
            <DraggableHead key={id} columnId={id} onMoveColumn={onMoveColumn}>
              <button type="button" onClick={onSort}>
                {id}
              </button>
              {id === "a" && <div role="separator" aria-label="resize" />}
            </DraggableHead>
          ))}
        </tr>
      </thead>
    </table>,
  );
  const heads = screen.getAllByRole("columnheader");
  heads.forEach((head, index) => {
    head.getBoundingClientRect = () =>
      ({ left: index * 100, right: index * 100 + 100, top: 0, bottom: 40 }) as DOMRect;
  });
  return { heads, onMoveColumn, onSort };
}

const press = (el: Element, x: number) =>
  fireEvent.pointerDown(el, { button: 0, clientX: x, pointerId: 1 });
const move = (x: number) => fireEvent.pointerMove(window, { clientX: x, pointerId: 1 });
const release = (x: number) => fireEvent.pointerUp(window, { clientX: x, pointerId: 1 });

describe("DraggableHead", () => {
  it("leaves a touch press alone so the table can still scroll sideways", () => {
    const { heads, onMoveColumn } = setup();
    fireEvent.pointerDown(heads[0]!, {
      button: 0,
      clientX: 50,
      pointerId: 1,
      pointerType: "touch",
    });
    move(250);
    release(250);
    expect(heads[0]).not.toHaveAttribute("data-dragging");
    expect(onMoveColumn).not.toHaveBeenCalled();
  });

  it("cancels a drag in progress when the header unmounts", () => {
    const onMoveColumn = vi.fn();
    const { unmount } = renderWithProviders(
      <table>
        <thead>
          <tr>
            <DraggableHead columnId="a" onMoveColumn={onMoveColumn}>
              a
            </DraggableHead>
          </tr>
        </thead>
      </table>,
    );
    const remove = vi.spyOn(window, "removeEventListener");
    press(screen.getByRole("columnheader"), 50);
    unmount();
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
    remove.mockRestore();
  });

  it("moves a column to the one it is dropped on, once, on release", () => {
    const { heads, onMoveColumn } = setup();
    press(heads[0]!, 50);
    move(150);
    move(250);
    expect(onMoveColumn).not.toHaveBeenCalled();
    release(250);
    expect(onMoveColumn).toHaveBeenCalledTimes(1);
    expect(onMoveColumn).toHaveBeenCalledWith("a", "c");
  });

  it("slides the dragged header with the pointer and marks where it will land", () => {
    const { heads } = setup();
    press(heads[0]!, 50);
    move(160);
    expect(heads[0]).toHaveAttribute("data-dragging", "true");
    expect(heads[0]!.style.transform).toBe("translate3d(110px, 0, 0)");
    expect(heads[1]).toHaveAttribute("data-drop", "right");

    release(160);
    expect(heads[0]).not.toHaveAttribute("data-dragging");
    expect(heads[0]!.style.transform).toBe("");
    expect(heads[1]).not.toHaveAttribute("data-drop");
  });

  it("marks the left edge when dragging toward an earlier column", () => {
    const { heads } = setup();
    press(heads[2]!, 250);
    move(150);
    expect(heads[1]).toHaveAttribute("data-drop", "left");
    release(150);
  });

  it("leaves a press that barely moves alone, so the header's own button still works", () => {
    const { heads, onMoveColumn, onSort } = setup();
    press(heads[0]!, 50);
    move(53);
    release(53);
    fireEvent.click(screen.getByRole("button", { name: "a" }));
    expect(onMoveColumn).not.toHaveBeenCalled();
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it("does not also sort when a real drag ends over the header's button", () => {
    const { heads, onSort } = setup();
    press(heads[0]!, 50);
    move(250);
    release(250);
    fireEvent.click(screen.getByRole("button", { name: "a" }));
    expect(onSort).not.toHaveBeenCalled();
  });

  it("does nothing when dropped back on itself or on no column", () => {
    const { heads, onMoveColumn } = setup();
    press(heads[0]!, 50);
    move(80);
    release(80);
    press(heads[0]!, 50);
    move(900);
    release(900);
    expect(onMoveColumn).not.toHaveBeenCalled();
  });

  it("ignores a press on the resize handle, which has its own gesture", () => {
    const { onMoveColumn } = setup();
    press(screen.getByRole("separator"), 50);
    move(250);
    release(250);
    expect(onMoveColumn).not.toHaveBeenCalled();
  });

  it("abandons the drag on cancel", () => {
    const { heads, onMoveColumn } = setup();
    press(heads[0]!, 50);
    move(250);
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(onMoveColumn).not.toHaveBeenCalled();
    expect(heads[0]).not.toHaveAttribute("data-dragging");
  });

  it("carries decorative edge arrows on both borders, hidden from assistive tech", () => {
    const { heads } = setup();
    const arrows = heads[0]!.querySelectorAll("svg");
    expect(arrows).toHaveLength(2);
    expect(arrows[0]).toHaveClass("group-hover/head:animate-nudge-left");
    expect(arrows[1]).toHaveClass("group-hover/head:animate-nudge-right");
    arrows.forEach((arrow) => expect(arrow).toHaveAttribute("aria-hidden", "true"));
  });

  it("tells the user the column can be dragged and dropped to rearrange", async () => {
    const { heads } = setup();
    fireEvent.focus(heads[0]!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Drag and drop to rearrange this column",
    );
  });
});
