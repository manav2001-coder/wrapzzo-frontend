import * as React from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";
import { ScrollTop } from "./scroll-top";

function Nav() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/second")}>
      Go
    </button>
  );
}

function Harness({ targetRef }: { targetRef?: React.RefObject<HTMLElement> }) {
  return (
    <MemoryRouter initialEntries={["/first"]}>
      <ScrollTop targetRef={targetRef} />
      <Nav />
      <Routes>
        <Route path="/first" element={<p>First</p>} />
        <Route path="/second" element={<p>Second</p>} />
      </Routes>
    </MemoryRouter>
  );
}

/** Same harness, but navigating to an ANCHOR on the other route rather than its top. */
function HashHarness() {
  function GoToHash() {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate("/second#somewhere")}>
        Go
      </button>
    );
  }
  return (
    <MemoryRouter initialEntries={["/first"]}>
      <ScrollTop />
      <GoToHash />
      <Routes>
        <Route path="/first" element={<p>First</p>} />
        <Route path="/second" element={<p>Second</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ScrollTop", () => {
  it("leaves a navigation to an ANCHOR alone", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;

    render(<HashHarness />);
    // The effect also runs on MOUNT, at "/first" with no hash — so clear that call first, or
    // the assertion below passes/fails on the wrong one.
    scrollTo.mockClear();

    await user.click(screen.getByRole("button", { name: "Go" }));
    await screen.findByText("Second");

    // The pathname changed, so this fires — and a hash is the reader asking for a specific
    // offset. Scrolling to the top here yanks them off the section they asked for, which is
    // what the landing page's own nav and the case studies' "back" link both do.
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("renders nothing", () => {
    const { container } = render(
      <MemoryRouter>
        <ScrollTop />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The load-bearing case: AppLayout's scroll container is its <main>, not the window, so
   * a literal port of v4's window.scrollTo would be a silent no-op here.
   */
  it("scrolls the target element on navigation", async () => {
    const user = userEvent.setup();
    const element = document.createElement("div");
    const scrollTo = vi.fn();
    element.scrollTo = scrollTo;
    const targetRef = { current: element } as React.RefObject<HTMLElement>;

    render(<Harness targetRef={targetRef} />);
    // Fires once on mount too.
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Go" }));
    await waitFor(() => expect(screen.getByText("Second")).toBeInTheDocument());
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "smooth" });
  });

  it("falls back to the window with no targetRef", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    render(<Harness />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Go" }));
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(2));
    vi.unstubAllGlobals();
  });

  it("turns behavior=auto into an INSTANT jump, not a CSS-inherited smooth one", async () => {
    const element = document.createElement("div");
    const scrollTo = vi.fn();
    element.scrollTo = scrollTo;

    render(
      <MemoryRouter>
        <ScrollTop
          targetRef={{ current: element } as React.RefObject<HTMLElement>}
          behavior="auto"
        />
      </MemoryRouter>,
    );

    /*
      This assertion used to expect `"auto"` — passing the caller's word straight through —
      and that pinned the BUG rather than the behaviour. In the CSSOM spec `"auto"` means
      "use this element's CSS `scroll-behavior`", and `index.css` sets
      `html { scroll-behavior: smooth }` for the landing page's anchors. So `PublicLayout`'s
      `behavior="auto"`, written to make a navigation instant, animated instead: opening a
      case study from halfway down the landing page scrolled the whole way up with the old
      page's footer sliding past. `"instant"` is the value that overrides the CSS.

      jsdom implements no scrolling, so only the ARGUMENT can be checked here — which is
      why the wrong one survived.
    */
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" }),
    );
  });

  it("does not throw when the element has no scrollTo (jsdom's default)", async () => {
    const element = document.createElement("div");
    // Explicitly remove the setup-file stub for this one element.
    Object.defineProperty(element, "scrollTo", { value: undefined, configurable: true });

    expect(() =>
      render(
        <MemoryRouter>
          <ScrollTop targetRef={{ current: element } as React.RefObject<HTMLElement>} />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
