"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes Bloom Market installable and gives it
 * an offline fallback.
 *
 * Registration is deliberately limited to production builds. In development the
 * worker would serve cached chunks against a Turbopack dev server and mask hot
 * reloads with stale assets, so it is skipped entirely.
 *
 * Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (cancelled || !registration.waiting) return;

        // A new worker is waiting. Activate it, then reload once so the tab runs
        // the new build. The reload is a real navigation, so it is suppressed
        // for visitors who have asked for reduced motion — they get the update
        // on their next natural visit instead of an unannounced refresh.
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        registration.waiting.addEventListener("statechange", (event) => {
          const worker = event.target as ServiceWorker | null;
          if (worker?.state !== "installed") return;
          void navigator.serviceWorker.ready.then(() => {
            if (reducedMotion) return;
            window.location.reload();
          });
        });
      } catch {
        // Registration failing (private mode, blocked by policy) must never
        // break the page — the site works fine without a service worker.
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}