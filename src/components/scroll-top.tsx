import * as React from "react";
import { useLocation } from "react-router-dom";

export interface ScrollTopProps {
  /**
   * The element to scroll. Required in this app: `AppLayout`'s scroll container is its
   * `<main className="flex-1 overflow-auto">`, NOT the window — so v4's `window.scrollTo`
   * would be a silent no-op here.
   */
  targetRef?: React.RefObject<HTMLElement | null>;
  behavior?: ScrollBehavior;
}

/**
 * Scrolls to the top on every navigation. Renders nothing.
 *
 * No children wrapper (v4 wrapped its subtree) because there is nothing to wrap, and no
 * react-router `<ScrollRestoration>` because that needs a data router — this app uses a
 * plain `<BrowserRouter>`.
 */
export function ScrollTop({ targetRef, behavior = "smooth" }: ScrollTopProps): null {
  /*
    `"auto"` does NOT mean "jump" — in the CSSOM spec it means "use this element's CSS
    `scroll-behavior`", and `index.css` sets `html { scroll-behavior: smooth }` for the
    landing page's in-page anchors. So `PublicLayout`'s `behavior="auto"`, written to make a
    navigation instant, inherited `smooth` instead: opening a case study from halfway down the
    landing page ANIMATED the whole way to the top, with the old page's footer sliding past.

    `"instant"` is the value that overrides the CSS. It is mapped here rather than at the call
    site so every caller asking for `auto` gets what the word plainly implies.
  */
  const effective: ScrollBehavior = behavior === "auto" ? "instant" : behavior;
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    // A hash is an explicit scroll instruction, so scrolling to the top would override the
    // reader's own request. It also has to be HONOURED here, not merely skipped: a router
    // navigation to `/#section` from another path is a pushState, and the browser performs
    // its fragment jump only on a real document load — so the case-study pages' "back" link
    // arrived at the landing page sitting at the top with nothing having scrolled.
    // `getElementById` rather than `querySelector(hash)`, which throws on an id that is not
    // a valid selector (a leading digit, say).
    if (hash) {
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: effective, block: "start" });
      return;
    }

    const element = targetRef?.current;
    if (element) {
      // Optional-chained: jsdom defines scrollTo on neither Element nor HTMLElement.
      element.scrollTo?.({ top: 0, left: 0, behavior: effective });
      return;
    }
    window.scrollTo?.({ top: 0, left: 0, behavior: effective });
  }, [pathname, hash, targetRef, effective]);

  return null;
}
