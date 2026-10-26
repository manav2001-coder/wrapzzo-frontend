import * as React from "react";
import { Maximize, Minimize } from "lucide-react";

import { IconButton } from "@/components/icon-button";

/**
 * Toggles the browser's fullscreen mode for the whole document.
 *
 * Ported from v4's `HeaderContent/FullScreen`. Two details that matter: the
 * `fullscreenchange` listener must be removed on unmount (React StrictMode double-mounts
 * in dev, so a leaked listener fires twice), and `requestFullscreen` is feature-detected
 * because it is absent in some embedded webviews — and in jsdom.
 */
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = React.useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement),
  );

  React.useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    if (typeof root.requestFullscreen === "function") void root.requestFullscreen();
  };

  return (
    <IconButton
      icon={isFullscreen ? Minimize : Maximize}
      label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={isFullscreen}
      onClick={toggle}
      className="hidden md:inline-flex"
    />
  );
}
