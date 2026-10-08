"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `refresh` every `intervalMs` while the page is visible, pauses while
 * the tab is hidden, and refreshes at once when it becomes visible again.
 * Returns a function that stops it. Keeps background tabs from loading the
 * server (systemsecured.md 4).
 */
export function startVisiblePolling(refresh: () => unknown, intervalMs: number) {
  let timer: number | undefined;
  const start = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => void refresh(), intervalMs);
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      window.clearInterval(timer);
    } else {
      void refresh();
      start();
    }
  };
  if (document.visibilityState === "visible") start();
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Hook form of `startVisiblePolling`. Pass `null` to stop polling. */
export function usePolling(refresh: () => unknown, intervalMs: number | null) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    if (intervalMs === null) return;
    return startVisiblePolling(() => latest.current(), intervalMs);
  }, [intervalMs]);
}
