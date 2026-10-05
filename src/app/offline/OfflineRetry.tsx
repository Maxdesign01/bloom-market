"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribes to the browser's online status so the message only appears once
 * the browser has confirmed we are genuinely offline.
 *
 * `useSyncExternalStore` is used rather than a `useState` + `useEffect` pair
 * because the browser is the source of truth here, not React state: reading it
 * this way keeps the server snapshot and the first client render identical
 * (avoiding a hydration mismatch) and updates only when the browser actually
 * reports a change.
 */
function subscribeToOnlineStatus(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineRetry() {
  const router = useRouter();

  // Assumed online during SSR and on the very first client render; corrected on
  // the first genuine change event or subscription read.
  const online = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => navigator.onLine,
    () => true,
  );

  const retry = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={retry}
        className="inline-flex items-center justify-center rounded-full bg-leaf-800 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-leaf-700"
      >
        Try again
      </button>
      {!online && (
        <p className="text-sm text-ink-soft" role="status">
          Still offline — check your connection and try again.
        </p>
      )}
    </div>
  );
}