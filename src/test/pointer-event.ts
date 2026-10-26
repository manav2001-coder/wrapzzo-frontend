/**
 * jsdom has no `PointerEvent`, so `fireEvent.pointerDown(el, { clientX, button })` builds a bare
 * `Event` that silently drops both. Importing this gives a MouseEvent-based stand-in, plus the
 * extra fields the table's drag and resize handles read (`pointerId`, `pointerType`).
 *
 * Opt-in per test file, NOT in `vitest.setup.ts`: a global stub changes what Radix's outside-click
 * handling sees, and `master-drawer.test.tsx` relies on the bare-event behaviour.
 */
if (typeof window.PointerEvent === "undefined") {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  Object.defineProperty(window, "PointerEvent", { value: PointerEventStub, configurable: true });
}

export {};
